"""Cube rotations past ±45° must look the same once baked for Minecraft."""

from __future__ import annotations

import copy
import json
import math
import sys
import unittest
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from src.skins.display import (  # noqa: E402
    FACE_ROTATION_ERROR,
    FACE_UV_ERROR,
    ROTATION_ERROR,
    TURNED_BOUNDS_ERROR,
    DisplayError,
    parse_and_merge_model,
)
from src.skins.element_rotation import (  # noqa: E402
    _corner_uv,
    _default_uv,
    _face_vertices,
    split_angle,
)

_ALL_FACES = ("down", "up", "north", "south", "west", "east")


def _turn(axis: str, angle: float, p, origin):
    """Minecraft element rotation: right-handed about axis through origin."""
    a = {"x": 0, "y": 1, "z": 2}[axis]
    b, c = (a + 1) % 3, (a + 2) % 3
    d = [p[k] - origin[k] for k in range(3)]
    cos, sin = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    out = list(d)
    out[b] = d[b] * cos - d[c] * sin
    out[c] = d[b] * sin + d[c] * cos
    return tuple(out[k] + origin[k] for k in range(3))


def _rendered(element: dict) -> set:
    """Every textured corner as (rounded world position, uv, texture)."""
    lo, hi = element["from"], element["to"]
    rot = element.get("rotation")
    out = set()
    for face, data in element["faces"].items():
        uv = data.get("uv") or _default_uv(face, lo, hi)
        for i, p in enumerate(_face_vertices(face, lo, hi)):
            if rot:
                p = _turn(rot["axis"], rot["angle"], p, rot["origin"])
            pos = tuple(round(n, 4) + 0.0 for n in p)
            uv_i = _corner_uv([float(n) for n in uv], data.get("rotation", 0), i)
            out.add((pos, uv_i, data["texture"]))
    return out


def _element(angle: float, axis: str = "y", **rot_extra) -> dict:
    return {
        "from": [6, 1, 5],
        "to": [9, 13, 8],
        "rotation": {"angle": angle, "axis": axis, "origin": [8, 7, 7], **rot_extra},
        "faces": {
            "north": {"uv": [0, 0, 3, 12], "texture": "#0"},
            "east": {"uv": [3, 0, 6, 12], "texture": "#0", "rotation": 90},
            "south": {"uv": [9, 12, 6, 0], "texture": "#0"},
            "west": {"texture": "#0", "cullface": "west"},
            "up": {"uv": [12, 0, 15, 3], "texture": "#0", "rotation": 270},
            "down": {"uv": [15, 0, 12, 3], "texture": "#0", "rotation": 180},
        },
    }


def _model(*elements: dict) -> bytes:
    return json.dumps(
        {"textures": {"0": "tfmc_submissions:item/x"}, "elements": list(elements)}
    ).encode("utf-8")


class SplitAngleTests(unittest.TestCase):
    def test_keeps_rest_within_45(self) -> None:
        for steps in range(-16, 17):
            angle = steps * 22.5
            turns, rest = split_angle(angle)
            with self.subTest(angle=angle):
                self.assertLessEqual(abs(rest), 45)
                self.assertAlmostEqual(angle, turns * 90 + rest)


class BakeQuarterTurnsTests(unittest.TestCase):
    def test_baked_cube_renders_the_same(self) -> None:
        for axis in ("x", "y", "z"):
            for steps in range(-16, 17):
                angle = steps * 22.5
                element = _element(angle, axis)
                before = _rendered(element)
                baked = parse_and_merge_model(_model(copy.deepcopy(element)), "item_3d")
                out = baked["elements"][0]
                with self.subTest(axis=axis, angle=angle):
                    self.assertIn(out["rotation"]["angle"], (-45, -22.5, 0, 22.5, 45))
                    self.assertEqual(set(_ALL_FACES), set(out["faces"]))
                    for face in out["faces"].values():
                        self.assertIn(face.get("rotation", 0), (0, 90, 180, 270))
                    self.assertEqual(before, _rendered(out))

    def test_67_5_keeps_its_axis_and_pivot(self) -> None:
        out = parse_and_merge_model(_model(_element(67.5)), "item_3d")["elements"][0]
        self.assertEqual({"angle": -22.5, "axis": "y", "origin": [8, 7, 7]}, out["rotation"])
        # A quarter turn about y moves the west face (and its cull) to south.
        self.assertEqual("south", out["faces"]["south"]["cullface"])

    def test_small_angles_unchanged(self) -> None:
        for angle in (-45, -22.5, 0, 22.5, 45):
            element = _element(angle)
            out = parse_and_merge_model(_model(copy.deepcopy(element)), "item_3d")
            with self.subTest(angle=angle):
                self.assertEqual(element, out["elements"][0])

    def test_single_axis_euler_becomes_axis_angle(self) -> None:
        element = _element(0)
        element["rotation"] = {"x": 0, "y": 0, "z": -67.5, "origin": [8, 7, 7]}
        expected = _rendered(_element(-67.5, "z"))
        out = parse_and_merge_model(_model(element), "item_3d")["elements"][0]
        self.assertEqual("z", out["rotation"]["axis"])
        self.assertNotIn("z", out["rotation"])
        self.assertEqual(expected, _rendered(out))

    def test_multi_axis_euler_still_rejected(self) -> None:
        element = _element(0)
        element["rotation"] = {"x": 22.5, "y": 45, "z": 0, "origin": [8, 7, 7]}
        with self.assertRaises(DisplayError) as ctx:
            parse_and_merge_model(_model(element), "item_3d")
        self.assertEqual(ROTATION_ERROR, str(ctx.exception))

    def test_off_step_angle_rejected(self) -> None:
        for angle in (30, 67, 100, 382.5, 1e300):
            with self.subTest(angle=angle), self.assertRaises(DisplayError) as ctx:
                parse_and_merge_model(_model(_element(angle)), "item_3d")
            self.assertEqual(ROTATION_ERROR, str(ctx.exception))

    def test_turn_out_of_bounds_rejected(self) -> None:
        element = _element(90)
        element["from"], element["to"] = [28, 0, 0], [32, 4, 4]
        element["rotation"]["origin"] = [-16, 0, 0]
        with self.assertRaises(DisplayError) as ctx:
            parse_and_merge_model(_model(element), "item_3d")
        self.assertEqual(TURNED_BOUNDS_ERROR, str(ctx.exception))

    def test_tiny_second_euler_axis_rejected(self) -> None:
        element = _element(0)
        element["rotation"] = {"x": 1e-7, "y": 22.5, "z": 0, "origin": [8, 7, 7]}
        with self.assertRaises(DisplayError) as ctx:
            parse_and_merge_model(_model(element), "item_3d")
        self.assertEqual(ROTATION_ERROR, str(ctx.exception))

    def test_bad_uv_rejected(self) -> None:
        for uv in (["a", 0, 1, 2], [None, 0, 1, 2], [0, 1, 2]):
            element = _element(90)
            element["faces"]["north"]["uv"] = uv
            with self.subTest(uv=uv), self.assertRaises(DisplayError) as ctx:
                parse_and_merge_model(_model(element), "item_3d")
            self.assertEqual(FACE_UV_ERROR, str(ctx.exception))

    def test_odd_cullface_ignored(self) -> None:
        element = _element(90)
        element["faces"]["north"]["cullface"] = ["north"]
        parse_and_merge_model(_model(element), "item_3d")

    def test_bad_face_rotation_rejected(self) -> None:
        element = _element(0)
        element["faces"]["north"]["rotation"] = 45
        with self.assertRaises(DisplayError) as ctx:
            parse_and_merge_model(_model(element), "item_3d")
        self.assertEqual(FACE_ROTATION_ERROR, str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
