"""Display autofill + validation for 3D skin model JSON.

Player-submitted display tabs win; defaults fill missing keys.
See docs/cosmetics/skins.md.
"""

from __future__ import annotations

import copy
import json
import math
from typing import Any

from .element_rotation import bake_quarter_turns, is_step_angle

HAND_TABS = (
    "thirdperson_righthand",
    "thirdperson_lefthand",
    "firstperson_righthand",
    "firstperson_lefthand",
)
COMMON_TABS = HAND_TABS + ("ground", "gui", "fixed")
HEAD_TAB = "head"

# Sensible Blockbench-style defaults (player values override).
# thirdperson matches Blockbench Display Mode → Item preset.
_DEFAULT_TAB: dict[str, Any] = {
    "thirdperson_righthand": {
        "rotation": [0, 0, 0],
        "translation": [0, 3, 1],
        "scale": [0.55, 0.55, 0.55],
    },
    "thirdperson_lefthand": {
        "rotation": [0, 0, 0],
        "translation": [0, 3, 1],
        "scale": [0.55, 0.55, 0.55],
    },
    "firstperson_righthand": {
        "rotation": [0, -90, 25],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
    "firstperson_lefthand": {
        "rotation": [0, -90, 25],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
    "ground": {
        "rotation": [0, 0, 0],
        "translation": [0, 2, 0],
        "scale": [0.5, 0.5, 0.5],
    },
    "gui": {
        "rotation": [30, 225, 0],
        "translation": [0, 0, 0],
        "scale": [0.8, 0.8, 0.8],
    },
    "fixed": {
        "rotation": [0, 180, 0],
        "translation": [0, 0, 0],
        "scale": [1, 1, 1],
    },
    "head": {
        "rotation": [0, 180, 0],
        "translation": [0, -4, 0],
        "scale": [1, 1, 1],
    },
}

# Round-shield-ish defaults for shield idle (autofill holes only).
_SHIELD_DEFAULTS: dict[str, Any] = {
    **copy.deepcopy(_DEFAULT_TAB),
    "thirdperson_righthand": {
        "rotation": [0, -90, 0],
        "translation": [2, -2, 1],
        "scale": [1.01, 1.01, 1.01],
    },
    "thirdperson_lefthand": {
        "rotation": [0, -90, 0],
        "translation": [2, -2, 2],
        "scale": [1.01, 1.01, 1.01],
    },
    "firstperson_righthand": {
        "translation": [-3, 0, 4],
        "scale": [0.78, 0.78, 0.78],
    },
    "firstperson_lefthand": {
        "translation": [-3, 0, 4],
        "scale": [0.78, 0.78, 0.78],
    },
    "gui": {"rotation": [0, -180, 0]},
    "head": {"translation": [0, 6, -7]},
    "fixed": {"scale": [2.5, 2.5, 2.5]},
}

# Vanilla item/bow.json and item/crossbow.json hand poses (autofill holes only).
_BOW_3D_DEFAULTS: dict[str, Any] = {
    **copy.deepcopy(_DEFAULT_TAB),
    "thirdperson_righthand": {
        "rotation": [-80, 260, -40],
        "translation": [-1, -2, 2.5],
        "scale": [0.9, 0.9, 0.9],
    },
    "thirdperson_lefthand": {
        "rotation": [-80, -280, 40],
        "translation": [-1, -2, 2.5],
        "scale": [0.9, 0.9, 0.9],
    },
    "firstperson_righthand": {
        "rotation": [0, -90, 25],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
    "firstperson_lefthand": {
        "rotation": [0, 90, -25],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
}
_CROSSBOW_3D_DEFAULTS: dict[str, Any] = {
    **copy.deepcopy(_DEFAULT_TAB),
    "thirdperson_righthand": {
        "rotation": [-90, 0, -60],
        "translation": [2, 0.1, -3],
        "scale": [0.9, 0.9, 0.9],
    },
    "thirdperson_lefthand": {
        "rotation": [-90, 0, 30],
        "translation": [2, 0.1, -3],
        "scale": [0.9, 0.9, 0.9],
    },
    "firstperson_righthand": {
        "rotation": [-90, 0, -55],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
    "firstperson_lefthand": {
        "rotation": [-90, 0, 35],
        "translation": [1.13, 3.2, 1.13],
        "scale": [0.68, 0.68, 0.68],
    },
}

# Held 3D kinds: hand/ground/gui/fixed tabs, no head unless the player adds one.
_HELD_KINDS = ("item_3d", "gun", "bow_3d", "crossbow_3d")


class DisplayError(ValueError):
    """Invalid or incomplete model display after merge."""


EXPORT_HINT = "Export in Blockbench as Java Block/Item (not Java Item)."
ROTATION_ERROR = (
    "Cubes may only rotate on one axis, in steps of 22.5°. " + EXPORT_HINT
)
FACE_ROTATION_ERROR = "Face texture rotation must be 0, 90, 180 or 270."
FACE_UV_ERROR = "Face uv must be four numbers."
NO_ELEMENTS_ERROR = "Model has no elements. " + EXPORT_HINT
ITEM_WRAPPER_ERROR = (
    "This looks like a Minecraft item definition, not a Java Block/Item model. "
    + EXPORT_HINT
)
PROJECT_FILE_ERROR = "This looks like a Blockbench project file. " + EXPORT_HINT
BOUNDS_ERROR = "Cube coordinates must be between -16 and 32."
TURNED_BOUNDS_ERROR = (
    "A cube rotated past 45° ends up outside -16 to 32 once turned. "
    "Move it or its pivot closer to the model centre."
)
TEXTURES_ERROR = "Model textures must be a map of texture ids to paths."
CUBE_ERROR = "Each cube needs from and to as three numbers."

_ALLOWED_AXES = frozenset({"x", "y", "z"})
_FACE_ROTATIONS = frozenset({0, 90, 180, 270})
_COORD_MIN = -16.0
_COORD_MAX = 32.0


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _angle_allowed(value: Any) -> bool:
    """Any multiple of 22.5°; past ±45° is baked into the cube on upload."""
    if not _is_number(value) or not math.isfinite(value):
        return False
    return is_step_angle(float(value))


def _single_axis_euler(rot: dict[str, Any]) -> tuple[str, float] | None:
    """1.21.11 x/y/z rotation turning on at most one axis, as (axis, angle)."""
    turned = []
    for axis in ("x", "y", "z"):
        value = rot.get(axis, 0)
        if not _is_number(value) or not math.isfinite(value):
            return None
        if value != 0:
            turned.append((axis, float(value)))
    if len(turned) > 1:
        return None
    return turned[0] if turned else ("y", 0.0)


def _vec3(value: Any) -> bool:
    if not isinstance(value, list) or len(value) != 3:
        return False
    return all(_is_number(n) for n in value)


def _coords_in_bounds(vec: list) -> bool:
    return all(_COORD_MIN <= float(n) <= _COORD_MAX for n in vec)


def validate_java_block_model(model: dict[str, Any]) -> None:
    """Reject JSON Minecraft cannot load as a Java Block/Item model."""
    nested = model.get("model")
    if isinstance(nested, dict) and "type" in nested:
        raise DisplayError(ITEM_WRAPPER_ERROR)
    if "meta" in model:
        raise DisplayError(PROJECT_FILE_ERROR)

    textures = model.get("textures")
    if textures is not None:
        if isinstance(textures, list):
            raise DisplayError(PROJECT_FILE_ERROR)
        if not isinstance(textures, dict):
            raise DisplayError(TEXTURES_ERROR)
        if any(not isinstance(v, str) for v in textures.values()):
            raise DisplayError(TEXTURES_ERROR)

    elements = model.get("elements")
    if not isinstance(elements, list) or len(elements) == 0:
        raise DisplayError(NO_ELEMENTS_ERROR)

    for el in elements:
        if not isinstance(el, dict):
            raise DisplayError(CUBE_ERROR)
        from_v = el.get("from")
        to_v = el.get("to")
        if not _vec3(from_v) or not _vec3(to_v):
            raise DisplayError(CUBE_ERROR)
        if not _coords_in_bounds(from_v) or not _coords_in_bounds(to_v):
            raise DisplayError(BOUNDS_ERROR)
        faces = el.get("faces")
        if isinstance(faces, dict):
            for face in faces.values():
                if not isinstance(face, dict):
                    continue
                if not _face_rotation_ok(face.get("rotation", 0)):
                    raise DisplayError(FACE_ROTATION_ERROR)
                uv = face.get("uv")
                if uv is not None and not _uv4(uv):
                    raise DisplayError(FACE_UV_ERROR)
        rot = el.get("rotation")
        if rot is None:
            continue
        if isinstance(rot, list) or not isinstance(rot, dict):
            raise DisplayError(ROTATION_ERROR)
        if "axis" in rot:
            axis, angle = rot.get("axis"), rot.get("angle")
        elif any(k in rot for k in ("x", "y", "z")):
            axis, angle = _single_axis_euler(rot) or (None, None)
        else:
            axis, angle = None, None
        if axis not in _ALLOWED_AXES or not _angle_allowed(angle):
            raise DisplayError(ROTATION_ERROR)
        if not _vec3(rot.get("origin")):
            raise DisplayError(ROTATION_ERROR)


def _uv4(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 4
        and all(_is_number(n) and math.isfinite(n) for n in value)
    )


def _face_rotation_ok(value: Any) -> bool:
    return _is_number(value) and value in _FACE_ROTATIONS


def to_vanilla_rotations(model: dict[str, Any]) -> None:
    """Rewrite validated cube rotations into what Minecraft 1.21.10 loads.

    x/y/z rotations become axis/angle, and angles past ±45° are baked into
    the cube as quarter turns.
    """
    for el in model["elements"]:
        rot = el.get("rotation")
        if rot is None:
            continue
        if "axis" not in rot:
            axis, angle = _single_axis_euler(rot)  # type: ignore[misc]
            for k in ("x", "y", "z"):
                rot.pop(k, None)
            rot["axis"], rot["angle"] = axis, angle
        bake_quarter_turns(el)
        if not _coords_in_bounds(el["from"]) or not _coords_in_bounds(el["to"]):
            raise DisplayError(TURNED_BOUNDS_ERROR)


def required_tabs(kind: str) -> tuple[str, ...]:
    if kind in ("shield", "helmet_3d", "armor_helmet_3d", "mask"):
        return COMMON_TABS + (HEAD_TAB,)
    if kind in _HELD_KINDS:
        return COMMON_TABS
    raise DisplayError(f"Unknown 3D kind for display: {kind}")


def defaults_for_kind(kind: str) -> dict[str, Any]:
    if kind == "shield":
        return copy.deepcopy(_SHIELD_DEFAULTS)
    if kind == "bow_3d":
        return copy.deepcopy(_BOW_3D_DEFAULTS)
    if kind == "crossbow_3d":
        return copy.deepcopy(_CROSSBOW_3D_DEFAULTS)
    return copy.deepcopy(_DEFAULT_TAB)


def merge_display(
    submitted: dict[str, Any] | None, kind: str
) -> dict[str, Any]:
    """Merge defaults under submitted display (submitted wins per tab)."""
    defaults = defaults_for_kind(kind)
    out = copy.deepcopy(defaults)
    if isinstance(submitted, dict):
        for key, value in submitted.items():
            if isinstance(value, dict):
                out[key] = copy.deepcopy(value)
    # Drop head from held-item defaults unless player supplied it.
    if kind in _HELD_KINDS and HEAD_TAB not in (submitted or {}):
        out.pop(HEAD_TAB, None)
    return out


def validate_display(display: dict[str, Any], kind: str) -> None:
    needed = required_tabs(kind)
    missing = [t for t in needed if t not in display or not isinstance(display[t], dict)]
    if missing:
        raise DisplayError(
            "Model display missing required tabs after autofill: "
            + ", ".join(missing)
        )


def parse_and_merge_model(raw: bytes, kind: str) -> dict[str, Any]:
    """Parse Blockbench JSON, merge display, validate; return full model dict."""
    if not raw:
        raise DisplayError("Empty model JSON")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        raise DisplayError("Model JSON must be UTF-8") from e
    try:
        model = json.loads(text)
    except json.JSONDecodeError as e:
        raise DisplayError(f"Invalid model JSON: {e}") from e
    if not isinstance(model, dict):
        raise DisplayError("Model JSON must be an object")
    validate_java_block_model(model)
    to_vanilla_rotations(model)
    submitted = model.get("display")
    if submitted is not None and not isinstance(submitted, dict):
        raise DisplayError("Model display must be an object")
    merged = merge_display(submitted, kind)
    validate_display(merged, kind)
    model["display"] = merged
    return model


def model_to_bytes(model: dict[str, Any]) -> bytes:
    return (json.dumps(model, indent=2) + "\n").encode("utf-8")
