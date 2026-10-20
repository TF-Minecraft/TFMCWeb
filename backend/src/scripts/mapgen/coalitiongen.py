"""Coalition map mode: SimpleFactions coalitions as regions, like the realm map.

Each coalition is one region: the land of every member's realm (the member and
all its subjects), in the coalition's colour. It goes through the same
pipeline as the realm map (`create_map` for the pick map, `generate_regions`
for the washed fills, ink borders and hover variants), so the viewer gives it
the realm map's labels, hover and click for free.

What the realm map has no equivalent for is the target. Each coalition also
gets `{rgb}_target.png`: its target's realm, hatched in the coalition's colour,
which the viewer lays over the map while that coalition is selected.

The region records go to `defines/{map}/coalition.json`, the file every region
mode reads its names, colours and provinces from.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

from ..bannergen.bannergen import create_banner
from ..loader.nations import load_nations
from ..util.border_paint import INK_DARK, border_thickness, stroke_opaque_union_array
from ..util.dirs import (
    banner_image,
    defines_file,
    input_file,
    region_image,
    region_overlay_file,
    validate_map,
)
from ..util.display_colour import hover_rgb
from ..util.overlay_metadata import crop_to_content
from .geometry_cache import MapGeometryCache
from .mapgen import create_map
from .regiongen import generate_regions, sanitize_filename

MODE = "coalition"
REGIONS_FILE = f"{MODE}.json"

HATCH_PERIOD = 36
HATCH_LINE = 14
# Each stripe is the coalition's map colour between two ink edges, so it reads
# on dark forest and pale sand alike.
HATCH_EDGE = 2
HATCH_ALPHA = 235
HATCH_EDGE_RGBA = (*INK_DARK[:3], 200)
# A dark wash under the stripes, so the coalition's own colour stands out even
# where the land beneath is the same hue.
TARGET_WASH_RGBA = (*INK_DARK[:3], 110)
# The target's border: red, the map's colour for hostility (fort zones of
# control are hatched in it too).
TARGET_BORDER_RGBA = (152, 52, 46, 255)
# Gaps narrower than this many pixels inside the target get no border.
BORDER_CLOSE = 11
# Used when neither the coalition nor its leader has a usable colour.
FALLBACK_RGB = (150, 140, 120)


def _parse_rgb(value: object) -> tuple[int, int, int] | None:
    if isinstance(value, str):
        parts = value.split(",")
    elif isinstance(value, (list, tuple)):
        parts = list(value)
    else:
        return None
    if len(parts) != 3:
        return None
    try:
        rgb = tuple(int(str(part).strip()) for part in parts)
    except ValueError:
        return None
    if not all(0 <= channel <= 255 for channel in rgb):
        return None
    return rgb  # type: ignore[return-value]


def _province_ids(raw: object) -> list[int]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    ids: list[int] = []
    for item in raw:
        try:
            pid = int(item)
        except (TypeError, ValueError):
            continue
        if pid > 0:
            ids.append(pid)
    return ids


def _id_list(raw: object) -> list[str]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    return [str(item) for item in raw if isinstance(item, (str, int)) and str(item)]


def coalition_rows(payload: object) -> list[dict]:
    """The coalition objects in an upload: a bare list or `{"coalitions": [...]}`."""
    if isinstance(payload, dict):
        payload = payload.get("coalitions")
    if not isinstance(payload, list):
        return []
    return [row for row in payload if isinstance(row, dict)]


def load_coalitions(map_name: str) -> list[dict]:
    path = input_file(map_name, "coalitions.json")
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return coalition_rows(json.load(f))


def load_compiled_nations(map_name: str) -> dict:
    path = defines_file(map_name, "nation.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, dict) else {}


def load_banner_patterns(map_name: str) -> dict[str, list[str]]:
    """Each realm's banner patterns, from the uploaded (not compiled) nations:
    the compiled file keeps only the rendered banner's file name."""
    try:
        nations = load_nations(map_name)
    except (OSError, ValueError):
        return {}
    out: dict[str, list[str]] = {}
    for key, value in nations.items():
        banner = value.get("banner") if isinstance(value, dict) else None
        if isinstance(banner, list) and all(isinstance(p, str) for p in banner):
            out[key] = banner
    return out


class _Nations:
    """Compiled realms, looked up without case as SimpleFactions does."""

    def __init__(self, nations: dict):
        self.nations = {key: value for key, value in nations.items() if isinstance(value, dict)}
        self._by_lower = {key.lower(): key for key in self.nations}

    def key(self, faction_id: object) -> str | None:
        if not isinstance(faction_id, str):
            return None
        if faction_id in self.nations:
            return faction_id
        return self._by_lower.get(faction_id.lower())

    def name(self, faction_id: str) -> str:
        key = self.key(faction_id)
        if key is None:
            return faction_id
        name = self.nations[key].get("name")
        return name if isinstance(name, str) and name else key

    def rgb(self, faction_id: str) -> tuple[int, int, int] | None:
        key = self.key(faction_id)
        return None if key is None else _parse_rgb(self.nations[key].get("rgb"))

    def realm(self, faction_id: str) -> list[str]:
        """The faction and every subject below it, overlord first."""
        start = self.key(faction_id)
        if start is None:
            return []
        seen: set[str] = set()
        order: list[str] = []
        stack = [start]
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            order.append(current)
            for subject in reversed(_id_list(self.nations[current].get("subjects"))):
                key = self.key(subject)
                if key is not None and key not in seen:
                    stack.append(key)
        return order

    def realm_provinces(self, faction_id: str) -> list[int]:
        out: list[int] = []
        for owner in self.realm(faction_id):
            out.extend(_province_ids(self.nations[owner].get("provinces")))
        return out


def _rgb_text(rgb: tuple[int, int, int] | None) -> str | None:
    return ",".join(map(str, rgb)) if rgb else None


def _unique_rgb(rgb: tuple[int, int, int], used: set[tuple[int, int, int]]) -> tuple[int, int, int]:
    """`rgb`, nudged until no other coalition has it: regions are keyed by
    colour, so two coalitions sharing one would merge into one shape. Black is
    the pick map's "nothing here", so it is never handed out either."""
    candidate = rgb
    step = 0
    while candidate in used or candidate == (0, 0, 0):
        step += 1
        delta = (step + 1) // 2 * (1 if step % 2 else -1)
        candidate = tuple(min(255, max(0, c + delta)) for c in rgb)  # type: ignore[assignment]
    used.add(candidate)
    return candidate


def compile_coalition_regions(
    coalitions: list[dict],
    nations: dict,
    banner_patterns: dict[str, list[str]] | None = None,
) -> dict[str, dict]:
    """Region records for the coalition map mode, keyed by coalition id.

    A province belongs to at most one coalition: the first one listing a realm
    that holds it. Members and targets missing from the realm data keep their
    id as their name and contribute no land.

    Each record carries its banner under `banner patterns`, the coalition's
    own or else its leader's; `run_coalition_mode` renders it and replaces it
    with the file name, as the nation compiler does.
    """
    realms = _Nations(nations)
    banner_patterns = banner_patterns or {}
    records: dict[str, dict] = {}
    claimed: set[int] = set()
    used_rgbs: set[tuple[int, int, int]] = set()

    for row in coalitions:
        cid = str(row.get("id") or "").strip()
        if not cid or cid in records:
            continue

        leader = str(row.get("leader") or "")
        target = str(row.get("target") or "")
        member_ids = _id_list(row.get("members"))
        if leader and not any(m.lower() == leader.lower() for m in member_ids):
            member_ids.insert(0, leader)

        rgb = _parse_rgb(row.get("rgb")) or realms.rgb(leader) or FALLBACK_RGB
        rgb = _unique_rgb(rgb, used_rgbs)

        provinces: list[int] = []
        for member in member_ids:
            for pid in realms.realm_provinces(member):
                if pid not in claimed:
                    claimed.add(pid)
                    provinces.append(pid)

        patterns = row.get("banner")
        if not (isinstance(patterns, list) and patterns and all(isinstance(p, str) for p in patterns)):
            patterns = banner_patterns.get(realms.key(leader) or leader)

        records[cid] = {
            "id": cid,
            "name": str(row.get("name") or cid),
            # What the hover tooltip says beside the name.
            "tier": f"Coalition against {realms.name(target)}" if target else "Coalition",
            "rgb": _rgb_text(rgb),
            "leader": realms.key(leader) or leader,
            "leader_name": realms.name(leader) if leader else "",
            "target": realms.key(target) or target,
            "target_name": realms.name(target) if target else "",
            "target_rgb": _rgb_text(realms.rgb(target)) if target else None,
            "target_provinces": sorted(set(realms.realm_provinces(target))) if target else [],
            "offensive": bool(row.get("offensive")),
            "members": [
                {
                    "id": realms.key(m) or m,
                    "name": realms.name(m),
                    "rgb": _rgb_text(realms.rgb(m)),
                    "size": len(realms.realm_provinces(m)),
                }
                for m in member_ids
            ],
            "provinces": provinces,
            "size": len(provinces),
            "banner patterns": patterns if isinstance(patterns, list) else None,
        }
    return records


def color_mapping(map_name: str, provinces: dict) -> dict:
    """Province RGB -> coalition RGB, for `build_color_mapping`."""
    path = defines_file(map_name, REGIONS_FILE)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        records = json.load(f)
    if not isinstance(records, dict):
        return {}
    id_to_rgb = {pid: rgb for rgb, pid in provinces.items()}
    out = {}
    for record in records.values():
        rgb = _parse_rgb(record.get("rgb")) if isinstance(record, dict) else None
        if rgb is None:
            continue
        for pid in _province_ids(record.get("provinces")):
            prov_rgb = id_to_rgb.get(pid)
            if prov_rgb is not None:
                out[prov_rgb] = rgb
    return out


def paint_target_hatch(
    province_id_map: np.ndarray,
    target_ids: list[int],
    rgb: tuple[int, int, int],
) -> tuple[Image.Image, dict[str, int]] | None:
    """The target's realm darkened, hatched in a light tint of the coalition's
    map colour and outlined in red, cropped to its land, with the crop box on the full map. None when the
    target holds no land."""
    if not target_ids:
        return None
    mask = np.isin(province_id_map, np.asarray(target_ids, dtype=province_id_map.dtype))
    rows = np.flatnonzero(mask.any(axis=1))
    if rows.size == 0:
        return None
    cols = np.flatnonzero(mask.any(axis=0))
    margin = border_thickness + 3
    height, width = province_id_map.shape
    y0, y1 = max(0, int(rows[0]) - margin), min(height, int(rows[-1]) + 1 + margin)
    x0, x1 = max(0, int(cols[0]) - margin), min(width, int(cols[-1]) + 1 + margin)
    window = mask[y0:y1, x0:x1]
    del mask

    out = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    out[window] = TARGET_WASH_RGBA
    ys, xs = np.nonzero(window)
    # Measured on the full map, so the stripes line up however it is cropped.
    offset = (xs + x0 + ys + y0) % HATCH_PERIOD
    on_line = offset < HATCH_LINE
    out[ys[on_line], xs[on_line]] = (*hover_rgb(rgb), HATCH_ALPHA)
    edge = on_line & ((offset < HATCH_EDGE) | (offset >= HATCH_LINE - HATCH_EDGE))
    out[ys[edge], xs[edge]] = HATCH_EDGE_RGBA

    # A red border around the realm, drawn on both sides of its edge so it
    # reads over the land and over whatever lies outside.
    # Outlined from a closed copy of the land: the province map leaves a few
    # stray unowned pixels inside realms, each of which would get a red ring.
    # Real gaps, rivers and lakes, are wider than the close and keep theirs.
    closed = Image.fromarray(window.astype(np.uint8) * 255, mode="L")
    closed = closed.filter(ImageFilter.MaxFilter(BORDER_CLOSE)).filter(ImageFilter.MinFilter(BORDER_CLOSE))
    outline = np.zeros_like(out)
    outline[np.asarray(closed) > 0] = (0, 0, 0, 255)
    stroke_opaque_union_array(outline, TARGET_BORDER_RGBA, border_thickness)
    out[np.all(outline == TARGET_BORDER_RGBA, axis=-1)] = TARGET_BORDER_RGBA

    img, meta = crop_to_content(Image.fromarray(out, mode="RGBA"))
    if meta is None:
        return None
    return img, {**meta, "x": meta["x"] + x0, "y": meta["y"] + y0}


def _write_json_atomic(path: str, payload: object) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def _render_banners(map_name: str, records: dict[str, dict]) -> None:
    folder = os.path.dirname(banner_image(map_name, MODE, "banner.png"))
    os.makedirs(folder, exist_ok=True)
    for name in os.listdir(folder):
        if name.endswith(".png"):
            os.remove(os.path.join(folder, name))
    for record in records.values():
        patterns = record.pop("banner patterns", None)
        banner_id = record["rgb"].replace(",", "_")
        if patterns:
            create_banner(map_name, MODE, banner_id, patterns)
            record["banner"] = banner_id
        else:
            record["banner"] = None


def _clear_regions(map_name: str) -> None:
    """Remove the mode's overlays and empty, rather than delete, their crop-box
    sidecar: the composite needs one to know the mode is drawn, and empty."""
    folder = os.path.dirname(region_image(map_name, MODE, "region.png"))
    os.makedirs(folder, exist_ok=True)
    for name in os.listdir(folder):
        if name.endswith(".png"):
            os.remove(os.path.join(folder, name))
    sidecar = region_overlay_file(map_name, MODE)
    os.makedirs(os.path.dirname(sidecar), exist_ok=True)
    _write_json_atomic(sidecar, {})


def run_coalition_mode(map_name: str, cache: MapGeometryCache | None = None) -> dict[str, dict]:
    """Compile the uploaded coalitions and draw the coalition map mode.

    Runs with no coalitions too, so a coalition that ends leaves the map.
    """
    validate_map(map_name)
    records = compile_coalition_regions(
        load_coalitions(map_name), load_compiled_nations(map_name), load_banner_patterns(map_name)
    )
    _render_banners(map_name, records)
    # Written first: the pick map and the region overlays read it.
    _write_json_atomic(defines_file(map_name, REGIONS_FILE), records)

    if cache is None:
        cache = MapGeometryCache.load(map_name)
    create_map(map_name, MODE, f"{MODE}_map", cache=cache)
    if any(record["provinces"] for record in records.values()):
        generate_regions(map_name, MODE, borders=True, cache=cache)
    else:
        # generate_regions skips a mode with nothing to draw, which would
        # leave the last coalitions' overlays behind.
        _clear_regions(map_name)

    # After generate_regions, which empties the mode's folder on a full run.
    for record in records.values():
        rgb = _parse_rgb(record["rgb"])
        painted = paint_target_hatch(cache.province_id_map, record["target_provinces"], rgb) if rgb else None
        if painted is None:
            continue
        img, meta = painted
        file_name = f"{sanitize_filename(rgb)}_target.png"
        path = region_image(map_name, MODE, file_name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img.save(path, "PNG")
        record["target_path"] = file_name
        record["target_overlay"] = meta
    _write_json_atomic(defines_file(map_name, REGIONS_FILE), records)

    print(f"Coalition map generated for '{map_name}': {len(records)} coalition(s)")
    return records


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate the coalition map mode")
    parser.add_argument("--map", default="main")
    args = parser.parse_args(argv)
    run_coalition_mode(args.map)
    return 0


if __name__ == "__main__":
    sys.exit(main())
