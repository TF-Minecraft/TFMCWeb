"""Minecraft ``.png.mcmeta`` texture animation: validation and first-frame crops.

Frames are laid out the way Minecraft reads them: frame size from the
animation's width/height (or a square of the shorter image side), numbered
left to right, then top to bottom.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

from PIL import Image

from .base_sets import mcmeta_max_bytes

_ANIMATION_KEYS = frozenset({"frametime", "interpolate", "width", "height", "frames"})


class AnimationError(ValueError):
    """Invalid .mcmeta or a PNG that does not fit its frames."""


def _positive_int(value: Any, *, minimum: int) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= minimum


def frame_size(animation: dict[str, Any], image: tuple[int, int]) -> tuple[int, int]:
    img_w, img_h = image
    w = animation.get("width")
    h = animation.get("height")
    if w is not None and h is not None:
        return w, h
    if w is not None:
        return w, img_h
    if h is not None:
        return img_w, h
    side = min(img_w, img_h)
    return side, side


def parse_mcmeta(
    data: bytes,
    image: tuple[int, int],
    expected_frame: tuple[int, int] | None = None,
    *,
    label: str = "texture",
) -> tuple[dict[str, Any], int]:
    """Validate an .mcmeta for a PNG of ``image`` size; return (clean json, frame count)."""
    cap = mcmeta_max_bytes()
    if not data:
        raise AnimationError(f"{label}: .mcmeta file is empty")
    if len(data) > cap:
        raise AnimationError(
            f"{label}: .mcmeta is {len(data)} bytes (limit {cap} bytes)"
        )
    try:
        raw = json.loads(data.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise AnimationError(f"{label}: .mcmeta is not valid JSON") from e
    if not isinstance(raw, dict) or set(raw) != {"animation"}:
        raise AnimationError(
            f'{label}: .mcmeta must be an object with only an "animation" section'
        )
    anim = raw["animation"]
    if not isinstance(anim, dict):
        raise AnimationError(f'{label}: .mcmeta "animation" must be an object')
    unknown = sorted(set(anim) - _ANIMATION_KEYS)
    if unknown:
        raise AnimationError(
            f"{label}: .mcmeta animation has unsupported keys: {', '.join(unknown)}"
        )

    clean: dict[str, Any] = {}
    if "frametime" in anim:
        if not _positive_int(anim["frametime"], minimum=1):
            raise AnimationError(f"{label}: .mcmeta frametime must be a whole number ≥ 1")
        clean["frametime"] = anim["frametime"]
    if "interpolate" in anim:
        if not isinstance(anim["interpolate"], bool):
            raise AnimationError(f"{label}: .mcmeta interpolate must be true or false")
        clean["interpolate"] = anim["interpolate"]
    for key in ("width", "height"):
        if key in anim:
            if not _positive_int(anim[key], minimum=1):
                raise AnimationError(f"{label}: .mcmeta {key} must be a whole number ≥ 1")
            clean[key] = anim[key]

    img_w, img_h = image
    fw, fh = frame_size(clean, image)
    if expected_frame is not None and (fw, fh) != expected_frame:
        ew, eh = expected_frame
        raise AnimationError(
            f"{label}: animation frames must be {ew}x{eh}, got {fw}x{fh}"
        )
    if fw > img_w or fh > img_h or img_w % fw or img_h % fh:
        raise AnimationError(
            f"{label}: a {img_w}x{img_h} PNG is not a whole grid of {fw}x{fh} frames"
        )
    count = (img_w // fw) * (img_h // fh)

    if "frames" in anim:
        frames = anim["frames"]
        if not isinstance(frames, list) or not frames:
            raise AnimationError(f"{label}: .mcmeta frames must be a non-empty list")
        out_frames: list[Any] = []
        for entry in frames:
            if isinstance(entry, dict):
                if set(entry) - {"index", "time"} or "index" not in entry:
                    raise AnimationError(
                        f"{label}: .mcmeta frame entries need an index (and optional time)"
                    )
                index = entry["index"]
                if "time" in entry and not _positive_int(entry["time"], minimum=1):
                    raise AnimationError(f"{label}: .mcmeta frame time must be ≥ 1")
                cleaned = {"index": index}
                if "time" in entry:
                    cleaned["time"] = entry["time"]
            else:
                index = entry
                cleaned = entry
            if not _positive_int(index, minimum=0):
                raise AnimationError(f"{label}: .mcmeta frame index must be a whole number ≥ 0")
            if index >= count:
                raise AnimationError(
                    f"{label}: .mcmeta frame {index} does not exist (PNG has {count} frames)"
                )
            out_frames.append(cleaned)
        clean["frames"] = out_frames
    return {"animation": clean}, count


def mcmeta_bytes(clean: dict[str, Any]) -> bytes:
    return json.dumps(clean, separators=(",", ":")).encode("utf-8")


def mcmeta_path(png: Path) -> Path:
    return png.with_name(png.name + ".mcmeta")


def _read_animation(png: Path) -> tuple[dict[str, Any], tuple[int, int], int] | None:
    """(animation, frame size, frame count) for a stored PNG with an .mcmeta, else None."""
    meta = mcmeta_path(png)
    if not meta.is_file():
        return None
    try:
        anim = json.loads(meta.read_text(encoding="utf-8")).get("animation") or {}
        with Image.open(png) as im:
            size = im.size
    except (OSError, ValueError, AttributeError):
        return None
    fw, fh = frame_size(anim, size)
    if fw <= 0 or fh <= 0 or size[0] % fw or size[1] % fh:
        return None
    return anim, (fw, fh), (size[0] // fw) * (size[1] // fh)


def frame_count(png: Path) -> int:
    """Animation frames of a stored PNG; 1 when it is not animated."""
    info = _read_animation(png)
    return info[2] if info else 1


def first_frame(png: Path, image: Image.Image) -> Image.Image:
    """Crop ``image`` (loaded from ``png``) to the frame Minecraft shows first."""
    info = _read_animation(png)
    if info is None:
        return image
    anim, (fw, fh), count = info
    index = 0
    frames = anim.get("frames")
    if isinstance(frames, list) and frames:
        head = frames[0]
        index = head.get("index", 0) if isinstance(head, dict) else head
        if not isinstance(index, int) or not 0 <= index < count:
            index = 0
    cols = image.width // fw
    x, y = (index % cols) * fw, (index // cols) * fh
    return image.crop((x, y, x + fw, y + fh))


def first_frame_png(png: Path) -> bytes | None:
    """First-frame PNG bytes for an animated stored PNG, else None."""
    if not mcmeta_path(png).is_file():
        return None
    try:
        with Image.open(png) as im:
            im.load()
            frame = first_frame(png, im.convert("RGBA"))
    except OSError:
        return None
    buf = io.BytesIO()
    frame.save(buf, format="PNG")
    return buf.getvalue()
