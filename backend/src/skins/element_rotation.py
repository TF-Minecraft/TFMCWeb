"""Bake cube rotations past ±45° into geometry so Minecraft 1.21.10 loads them.

Minecraft before 1.21.11 only accepts element angles of 0, ±22.5 and ±45.
Any multiple of 22.5 splits into whole quarter turns plus one of those
angles. A quarter turn of an axis-aligned cube is still an axis-aligned
cube, so we turn its corners and faces exactly and keep the remainder as
the element rotation.
"""

from __future__ import annotations

import copy
from typing import Any

ANGLE_STEP = 22.5
_EPS = 1e-6

Vec3 = tuple[float, float, float]

_AXIS_INDEX = {"x": 0, "y": 1, "z": 2}
_FACE_NORMALS: dict[str, tuple[int, int, int]] = {
    "down": (0, -1, 0),
    "up": (0, 1, 0),
    "north": (0, 0, -1),
    "south": (0, 0, 1),
    "west": (-1, 0, 0),
    "east": (1, 0, 0),
}
_NORMAL_FACES = {v: k for k, v in _FACE_NORMALS.items()}


def _face_vertices(face: str, lo: Vec3, hi: Vec3) -> list[Vec3]:
    """Corners in Minecraft FaceInfo order (UV corners 0..3 bind to these)."""
    x0, y0, z0 = lo
    x1, y1, z1 = hi
    return {
        "down": [(x0, y0, z1), (x0, y0, z0), (x1, y0, z0), (x1, y0, z1)],
        "up": [(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)],
        "north": [(x1, y1, z0), (x1, y0, z0), (x0, y0, z0), (x0, y1, z0)],
        "south": [(x0, y1, z1), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1)],
        "west": [(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)],
        "east": [(x1, y1, z1), (x1, y0, z1), (x1, y0, z0), (x1, y1, z0)],
    }[face]


def _default_uv(face: str, lo: Vec3, hi: Vec3) -> list[float]:
    """Minecraft's UV for a face that omits "uv"."""
    x0, y0, z0 = lo
    x1, y1, z1 = hi
    return {
        "down": [x0, 16 - z1, x1, 16 - z0],
        "up": [x0, z0, x1, z1],
        "north": [16 - x1, 16 - y1, 16 - x0, 16 - y0],
        "south": [x0, 16 - y1, x1, 16 - y0],
        "west": [z0, 16 - y1, z1, 16 - y0],
        "east": [16 - z1, 16 - y1, 16 - z0, 16 - y0],
    }[face]


def _corner_uv(uv: list[float], rotation: int, i: int) -> tuple[float, float]:
    """Minecraft BlockFaceUV.getU/getV for vertex i."""
    j = (i + rotation // 90) % 4
    u = uv[0] if j in (0, 1) else uv[2]
    v = uv[1] if j in (0, 3) else uv[3]
    return (u, v)


def _quarter_turn(axis: str, turns: int, p: Vec3, origin: Vec3) -> Vec3:
    """Right-handed quarter turns about axis through origin (as Minecraft)."""
    a = _AXIS_INDEX[axis]
    b, c = (a + 1) % 3, (a + 2) % 3
    d = [p[k] - origin[k] for k in range(3)]
    for _ in range(turns % 4):
        d[b], d[c] = -d[c], d[b]
    return tuple(d[k] + origin[k] for k in range(3))  # type: ignore[return-value]


def _close(a: Vec3, b: Vec3) -> bool:
    return all(abs(a[k] - b[k]) < _EPS for k in range(3))


def split_angle(angle: float) -> tuple[int, float]:
    """angle = turns * 90 + rest, with rest in [-45, 45]."""
    turns = round(angle / 90)
    rest = angle - turns * 90
    if abs(rest) < _EPS:
        rest = 0.0
    return turns, rest


def is_step_angle(value: float) -> bool:
    steps = value / ANGLE_STEP
    return abs(steps - round(steps)) < _EPS


def _turn_face(
    face: str,
    data: dict[str, Any],
    lo: Vec3,
    hi: Vec3,
    new_lo: Vec3,
    new_hi: Vec3,
    axis: str,
    turns: int,
    origin: Vec3,
) -> tuple[str, dict[str, Any]]:
    normal = _FACE_NORMALS[face]
    turned_normal = tuple(
        round(n) for n in _quarter_turn(axis, turns, normal, (0.0, 0.0, 0.0))
    )
    new_face = _NORMAL_FACES[turned_normal]  # type: ignore[index]

    out = copy.deepcopy(data)
    uv = data.get("uv")
    if not isinstance(uv, list) or len(uv) != 4:
        uv = _default_uv(face, lo, hi)
    uv = [float(n) for n in uv]
    rotation = int(data.get("rotation", 0) or 0) % 360

    # Each corner keeps its UV through the turn; find the face rotation that
    # puts the same UV on the same corner of the new face.
    wanted = [
        (_quarter_turn(axis, turns, p, origin), _corner_uv(uv, rotation, i))
        for i, p in enumerate(_face_vertices(face, lo, hi))
    ]
    new_vertices = _face_vertices(new_face, new_lo, new_hi)
    for new_rotation in (0, 90, 180, 270):
        if all(
            any(
                _close(p, new_vertices[i])
                and _corner_uv(uv, new_rotation, i) == corner
                for i in range(4)
            )
            for p, corner in wanted
        ):
            break
    else:  # pragma: no cover - a quarter turn always lines up
        raise AssertionError(f"no UV rotation for {face} -> {new_face}")

    out["uv"] = uv
    if new_rotation:
        out["rotation"] = new_rotation
    else:
        out.pop("rotation", None)
    cull = data.get("cullface")
    if cull in _FACE_NORMALS:
        cull_normal = tuple(
            round(n)
            for n in _quarter_turn(
                axis, turns, _FACE_NORMALS[cull], (0.0, 0.0, 0.0)
            )
        )
        out["cullface"] = _NORMAL_FACES[cull_normal]  # type: ignore[index]
    return new_face, out


def bake_quarter_turns(element: dict[str, Any]) -> None:
    """Rewrite an element in place so its rotation angle is within ±45.

    Expects a validated element whose rotation has axis, origin and an angle
    that is a multiple of 22.5.
    """
    rot = element.get("rotation")
    if not isinstance(rot, dict):
        return
    angle = float(rot["angle"])
    turns, rest = split_angle(angle)
    if turns % 4 == 0:
        rot["angle"] = rest
        return
    axis = rot["axis"]
    origin: Vec3 = tuple(float(n) for n in rot["origin"])  # type: ignore[assignment]
    lo: Vec3 = tuple(float(n) for n in element["from"])  # type: ignore[assignment]
    hi: Vec3 = tuple(float(n) for n in element["to"])  # type: ignore[assignment]
    a = _quarter_turn(axis, turns, lo, origin)
    b = _quarter_turn(axis, turns, hi, origin)
    new_lo: Vec3 = tuple(min(a[k], b[k]) for k in range(3))  # type: ignore[assignment]
    new_hi: Vec3 = tuple(max(a[k], b[k]) for k in range(3))  # type: ignore[assignment]

    faces = element.get("faces")
    if isinstance(faces, dict):
        element["faces"] = dict(
            _turn_face(name, data, lo, hi, new_lo, new_hi, axis, turns, origin)
            for name, data in faces.items()
            if name in _FACE_NORMALS and isinstance(data, dict)
        )
    element["from"] = [_tidy(n) for n in new_lo]
    element["to"] = [_tidy(n) for n in new_hi]
    rot["angle"] = rest


def _tidy(n: float) -> float | int:
    r = round(n, 6)
    return int(r) if r == int(r) else r
