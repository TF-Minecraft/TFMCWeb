"""Coalition map mode: SimpleFactions coalitions painted over the base map.

Members' realms (each member plus its subjects, all the way down) take the
coalition's colour; the realm a coalition is aimed at is hatched in that colour,
striped in turns when several coalitions share one target. Each coalition's land
is outlined in ink, with a fainter line between the realms inside it, so the
members stay readable.

Besides the raster, this writes `defines/{map}/coalition_map.json`: the
coalitions resolved against today's realms and a per-province summary. The
province tooltip reads it, and the chronicle captures it so a stored day can
paint its own coalitions.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np

from ..province_id_grid import GRID_FILENAME, build_province_id_map, read_province_id_grid_file
from ..util.border_paint import INK_DARK
from ..util.dirs import defines_file, input_file, map_image, validate_map
from ..util.display_colour import parchment_wash_rgb
from .geometry_cache import MapGeometryCache
from .map_paint_numpy import rgba_array_to_image

COALITION_MAP_FILE = "coalition_map.json"

FILL_ALPHA = 215
# Target land: a light ink wash under the stripes, so the gaps between them
# still read as marked whatever the terrain beneath.
TARGET_WASH_ALPHA = 70
HATCH_ALPHA = 235
# A stored day paints with one colour per province, so its target has no
# stripes; this alpha keeps it lighter than member land, as the stripes do.
DAY_TARGET_ALPHA = 120
# Darkens a coalition's colour a little for its hatch and target outline,
# keeping it saturated enough to stand out from the terrain.
HATCH_INK_BLEND = 0.15
HATCH_PERIOD = 36
HATCH_LINE = 13
# Each stripe is the coalition's pale fill between two thin ink edges, which
# reads on dark forest and pale sand alike.
HATCH_EDGE = 2
HATCH_EDGE_RGBA = (*INK_DARK[:3], 190)
OUTLINE_RADIUS = 2
OUTLINE_RGBA = (*INK_DARK[:3], 230)
REALM_SEAM_RGBA = (*INK_DARK[:3], 120)
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


def _blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))  # type: ignore[return-value]


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

    def provinces(self, faction_id: str) -> list[int]:
        key = self.key(faction_id)
        return [] if key is None else _province_ids(self.nations[key].get("provinces"))


def _colours(rgb: tuple[int, int, int]) -> dict:
    fill = parchment_wash_rgb(rgb)
    hatch = _blend(rgb, INK_DARK[:3], HATCH_INK_BLEND)
    return {
        "fill_rgba": [*fill, FILL_ALPHA],
        "hatch_rgba": [*hatch, HATCH_ALPHA],
    }


def compile_coalition_map(coalitions: list[dict], nations: dict) -> dict:
    """Resolve uploaded coalitions against compiled realms.

    A province belongs to at most one coalition: the first one listing a realm
    that holds it. It can also be targeted by any number of coalitions. Members
    and targets missing from the realm data keep their id as their name and
    paint nothing.
    """
    realms = _Nations(nations)
    resolved: list[dict] = []
    member_of: dict[int, tuple[str, str, str]] = {}
    targeted_by: dict[int, list[str]] = {}
    seen_ids: set[str] = set()

    for row in coalitions:
        cid = str(row.get("id") or "").strip()
        if not cid or cid in seen_ids:
            continue
        seen_ids.add(cid)

        leader = str(row.get("leader") or "")
        target = str(row.get("target") or "")
        member_ids = _id_list(row.get("members"))
        if leader and not any(m.lower() == leader.lower() for m in member_ids):
            member_ids.insert(0, leader)

        rgb = _parse_rgb(row.get("rgb"))
        leader_key = realms.key(leader)
        if rgb is None and leader_key is not None:
            rgb = _parse_rgb(realms.nations[leader_key].get("rgb"))
        if rgb is None or rgb == (0, 0, 0):
            rgb = FALLBACK_RGB

        banner = row.get("banner")
        resolved.append(
            {
                "id": cid,
                "name": str(row.get("name") or cid),
                "rgb": ",".join(str(c) for c in rgb),
                **_colours(rgb),
                "leader": realms.key(leader) or leader,
                "leader_name": realms.name(leader) if leader else "",
                "target": realms.key(target) or target,
                "target_name": realms.name(target) if target else "",
                "offensive": bool(row.get("offensive")),
                "members": [
                    {"id": realms.key(m) or m, "name": realms.name(m)} for m in member_ids
                ],
                "banner": banner if isinstance(banner, list) else None,
            }
        )

        for member in member_ids:
            member_key = realms.key(member)
            if member_key is None:
                continue
            for owner in realms.realm(member_key):
                for pid in realms.provinces(owner):
                    member_of.setdefault(pid, (cid, member_key, owner))

        if target:
            for owner in realms.realm(target):
                for pid in realms.provinces(owner):
                    claims = targeted_by.setdefault(pid, [])
                    if cid not in claims:
                        claims.append(cid)

    provinces = []
    for pid in sorted(set(member_of) | set(targeted_by)):
        entry: dict = {"id": pid}
        if pid in member_of:
            cid, member, owner = member_of[pid]
            entry.update({"coalition": cid, "member": member, "owner": owner})
        if pid in targeted_by:
            entry["targeted_by"] = targeted_by[pid]
        provinces.append(entry)

    return {"coalitions": resolved, "provinces": provinces}


def load_coalition_by_province(map_name: str) -> dict[int, dict]:
    """Province id -> what the province tooltip says about coalitions there."""
    path = defines_file(map_name, COALITION_MAP_FILE)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        compiled = json.load(f)
    if not isinstance(compiled, dict):
        return {}
    coalitions = {c.get("id"): c for c in compiled.get("coalitions") or [] if isinstance(c, dict)}
    members = {}
    for c in coalitions.values():
        for m in c.get("members") or []:
            if isinstance(m, dict):
                members[(c.get("id"), m.get("id"))] = m.get("name")

    out: dict[int, dict] = {}
    for row in compiled.get("provinces") or []:
        if not isinstance(row, dict) or not isinstance(row.get("id"), int):
            continue
        entry: dict = {}
        own = coalitions.get(row.get("coalition"))
        if own is not None:
            entry.update(
                {
                    "coalition": own.get("name"),
                    "coalition_member": members.get((own.get("id"), row.get("member")), row.get("member")),
                    "coalition_leader": own.get("leader_name"),
                    "coalition_target": own.get("target_name"),
                    "coalition_offensive": bool(own.get("offensive")),
                }
            )
        targeted = [coalitions[c].get("name") for c in row.get("targeted_by") or [] if c in coalitions]
        if targeted:
            entry["coalition_targeted_by"] = targeted
        if entry:
            out[row["id"]] = entry
    return out


def _differs_from_neighbour(values: np.ndarray) -> np.ndarray:
    """Pixels whose value differs from a 4-neighbour. Off the array counts as 0,
    so land at the map's edge is outlined as it is against the sea.

    Works on views and boolean masks only: the map is 41M pixels, and a padded
    copy of an integer array costs hundreds of MB.
    """
    out = np.zeros(values.shape, dtype=bool)
    step = values[1:, :] != values[:-1, :]
    out[1:, :] |= step
    out[:-1, :] |= step
    del step
    step = values[:, 1:] != values[:, :-1]
    out[:, 1:] |= step
    out[:, :-1] |= step
    del step
    out[0, :] |= values[0, :] != 0
    out[-1, :] |= values[-1, :] != 0
    out[:, 0] |= values[:, 0] != 0
    out[:, -1] |= values[:, -1] != 0
    return out


def _grow(mask: np.ndarray, radius: int) -> np.ndarray:
    """`mask` grown by a (2r+1) square, with boolean shifts rather than the
    int32 prefix sums `dilate_square` allocates."""
    out = mask.copy()
    for axis in (0, 1):
        for _ in range(radius):
            source = out.copy()
            if axis == 0:
                out[1:, :] |= source[:-1, :]
                out[:-1, :] |= source[1:, :]
            else:
                out[:, 1:] |= source[:, :-1]
                out[:, :-1] |= source[:, 1:]
    return out


def _small_uint(count: int) -> type:
    return np.uint8 if count < 0xFF else np.uint16 if count < 0xFFFF else np.uint32


def paint_coalition_overlay(province_id_map: np.ndarray, compiled: dict) -> np.ndarray:
    """The (H, W, 4) RGBA overlay for a compiled coalition map."""
    height, width = province_id_map.shape
    coalitions = compiled.get("coalitions") or []
    rows = compiled.get("provinces") or []
    if not coalitions or not rows:
        return np.zeros((height, width, 4), dtype=np.uint8)

    index = {c["id"]: i + 1 for i, c in enumerate(coalitions)}
    fills = np.zeros((len(coalitions) + 1, 4), dtype=np.uint8)
    hatches = np.zeros((len(coalitions) + 1, 4), dtype=np.uint8)
    for i, c in enumerate(coalitions, start=1):
        fills[i] = c["fill_rgba"]
        hatches[i] = c["hatch_rgba"]

    owners: dict[str, int] = {}
    target_sets: dict[tuple[int, ...], int] = {}
    max_id = int(province_id_map.max())
    member_rows: list[tuple[int, int, int]] = []
    target_rows: list[tuple[int, int]] = []
    for row in rows:
        pid = row["id"]
        if pid > max_id:
            continue
        if row.get("coalition") in index:
            owner = owners.setdefault(row.get("owner") or "", len(owners) + 1)
            member_rows.append((pid, index[row["coalition"]], owner))
        claims = tuple(index[c] for c in row.get("targeted_by") or [] if c in index)
        if claims:
            target_rows.append((pid, target_sets.setdefault(claims, len(target_sets) + 1)))

    member_lut = np.zeros(max_id + 1, dtype=_small_uint(len(coalitions) + 1))
    owner_lut = np.zeros(max_id + 1, dtype=_small_uint(len(owners) + 1))
    target_lut = np.zeros(max_id + 1, dtype=_small_uint(len(target_sets) + 1))
    for pid, coalition, owner in member_rows:
        member_lut[pid] = coalition
        owner_lut[pid] = owner
    for pid, set_index in target_rows:
        target_lut[pid] = set_index

    member = member_lut[province_id_map]
    target = target_lut[province_id_map]
    in_coalition = member > 0
    has_target = target > 0

    # Each target set's claimants in stripe order, padded; stripe k of a pixel
    # takes claimant k modulo the set's size.
    longest = max((len(claims) for claims in target_sets), default=1)
    claim_table = np.zeros((len(target_sets) + 1, longest), dtype=np.int32)
    claim_count = np.ones(len(target_sets) + 1, dtype=np.int32)
    for claims, set_index in target_sets.items():
        claim_table[set_index, : len(claims)] = claims
        claim_count[set_index] = len(claims)
    first_claim = claim_table[:, 0]

    # Index 0 of `fills` is transparent, so this also clears every other pixel.
    out = fills[member]

    # Target land outside any coalition gets a light ink wash so the gaps
    # between stripes still read as marked; target land inside one keeps its
    # fill.
    washed = has_target & ~in_coalition
    out[washed] = (*INK_DARK[:3], TARGET_WASH_ALPHA)

    ys, xs = np.nonzero(has_target)
    if ys.size:
        diagonal = xs + ys
        on_line = (diagonal % HATCH_PERIOD) < HATCH_LINE
        ys, xs, diagonal = ys[on_line], xs[on_line], diagonal[on_line]
        sets = target[ys, xs]
        stripe = (diagonal // HATCH_PERIOD) % claim_count[sets]
        stripe_fill = fills[claim_table[sets, stripe]]
        stripe_fill[:, 3] = HATCH_ALPHA
        out[ys, xs] = stripe_fill
        offset = diagonal % HATCH_PERIOD
        edge = (offset < HATCH_EDGE) | (offset >= HATCH_LINE - HATCH_EDGE)
        out[ys[edge], xs[edge]] = HATCH_EDGE_RGBA
    del ys, xs

    # A faint seam between the realms inside one coalition.
    member_edge = _differs_from_neighbour(member)
    seam = _differs_from_neighbour(owner_lut[province_id_map])
    seam &= in_coalition
    seam &= ~member_edge
    out[seam] = _over(out[seam], REALM_SEAM_RGBA)
    del seam

    # Ink around each coalition, drawn inside its own land.
    member_edge &= in_coalition
    ring = _grow(member_edge, OUTLINE_RADIUS)
    ring &= in_coalition
    out[ring] = OUTLINE_RGBA
    del member_edge, ring

    # Target realms outside a coalition are outlined in their first
    # claimant's ink.
    target_edge = _differs_from_neighbour(target)
    target_edge &= has_target
    ring = _grow(target_edge, OUTLINE_RADIUS)
    ring &= washed
    out[ring] = hatches[first_claim[target[ring]]]

    return out


def _over(pixels: np.ndarray, rgba: tuple[int, int, int, int]) -> np.ndarray:
    """`rgba` composited over opaque-ish `pixels`, keeping their alpha."""
    if pixels.size == 0:
        return pixels
    t = rgba[3] / 255.0
    out = pixels.copy()
    out[:, :3] = np.round(pixels[:, :3] * (1 - t) + np.asarray(rgba[:3]) * t).astype(np.uint8)
    return out


def _province_id_map(map_name: str, cache: MapGeometryCache | None) -> np.ndarray:
    """The full-size province id grid, without decoding provinces.png when a
    regeneration has already written it: the upload path runs inside the web
    server, where the full geometry cache costs over a gigabyte."""
    if cache is not None:
        return cache.province_id_map
    grid = defines_file(map_name, GRID_FILENAME)
    if os.path.isfile(grid):
        return read_province_id_grid_file(grid)[2]
    return build_province_id_map(map_name)[2]


def _read_json(path: str) -> object:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _write_json_atomic(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def create_coalition_map(
    map_name: str,
    filename: str = "coalition",
    cache: MapGeometryCache | None = None,
) -> None:
    """Write `coalition_map.json` and the `coalition` raster for `map_name`.

    Runs with no coalitions too, so a coalition that ends clears its land.
    Skips the paint when neither the coalitions nor their realms' land
    changed, so a repeated upload costs only the compile.
    """
    validate_map(map_name)
    compiled = compile_coalition_map(load_coalitions(map_name), load_compiled_nations(map_name))
    compiled_path = defines_file(map_name, COALITION_MAP_FILE)
    output_path = map_image(map_name, filename)
    if os.path.isfile(output_path) and _read_json(compiled_path) == compiled:
        return
    _write_json_atomic(compiled_path, compiled)

    painted = paint_coalition_overlay(_province_id_map(map_name, cache), compiled)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    tmp = f"{output_path}.tmp"
    rgba_array_to_image(painted).save(tmp, "PNG")
    os.replace(tmp, output_path)

    print(
        f"Coalition map generated -> {output_path} | "
        f"coalitions: {len(compiled['coalitions'])} | provinces: {len(compiled['provinces'])}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate the coalition map mode")
    parser.add_argument("--map", default="main")
    args = parser.parse_args(argv)
    create_coalition_map(args.map)
    return 0


if __name__ == "__main__":
    sys.exit(main())
