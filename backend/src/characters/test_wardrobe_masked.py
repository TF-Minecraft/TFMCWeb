"""Unit tests for wardrobe masked compose + sequential stack helpers."""

from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path
from unittest import mock

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from PIL import Image  # noqa: E402

from src.characters.wardrobe import (  # noqa: E402
    DEFAULT_SLOT_NAMES,
    SLOTS,
    SWAPPABLE_ORDER,
    WardrobeError,
    compose_masked_skin,
    _require_sequential_fill,
    _slot_unlocked,
)


def _png(color: tuple[int, int, int, int], *, head=None) -> bytes:
    img = Image.new("RGBA", (64, 64), color)
    if head is not None:
        for y in range(16):
            for x in range(64):
                img.putpixel((x, y), head)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class ComposeMaskedTest(unittest.TestCase):
    def test_head_from_base_body_from_template(self) -> None:
        base = _png((10, 20, 30, 255), head=(1, 2, 3, 255))
        templ = _png((200, 100, 50, 255), head=(0, 0, 0, 0))
        out = compose_masked_skin(base, templ)
        img = Image.open(io.BytesIO(out)).convert("RGBA")
        self.assertEqual(img.getpixel((8, 8))[:3], (1, 2, 3))
        self.assertEqual(img.getpixel((40, 8))[:3], (1, 2, 3))  # hat strip
        self.assertEqual(img.getpixel((20, 40))[:3], (200, 100, 50))


class SequentialFillTest(unittest.TestCase):
    def test_extra1_needs_base(self) -> None:
        with self.assertRaises(WardrobeError) as ctx:
            _require_sequential_fill("extra_1", {})
        self.assertIn("Base", str(ctx.exception))

    def test_extra2_needs_extra1(self) -> None:
        slots = {"base": {"png_relpath": "x"}}
        with self.assertRaises(WardrobeError) as ctx:
            _require_sequential_fill("extra_2", slots)
        self.assertIn("Skin 2", str(ctx.exception))

    def test_ok_when_prior_filled(self) -> None:
        slots = {
            "base": {"png_relpath": "a"},
            "extra_1": {"png_relpath": "b"},
        }
        _require_sequential_fill("extra_2", slots)

    def test_fifth_skin_needs_the_fourth(self) -> None:
        slots = {key: {"png_relpath": key} for key in ("base", "extra_1", "extra_2")}
        with self.assertRaises(WardrobeError) as ctx:
            _require_sequential_fill("extra_4", slots)
        self.assertEqual(str(ctx.exception), "Upload Skin 4 before Skin 5")
        slots["extra_3"] = {"png_relpath": "d"}
        _require_sequential_fill("extra_4", slots)

    def test_base_and_masked_need_nothing_before_them(self) -> None:
        _require_sequential_fill("base", {})
        _require_sequential_fill("masked", {})


class SlotLayoutTest(unittest.TestCase):
    def test_five_swappable_slots_then_masked(self) -> None:
        self.assertEqual(SWAPPABLE_ORDER, ("base", "extra_1", "extra_2", "extra_3", "extra_4"))
        self.assertEqual(SLOTS, SWAPPABLE_ORDER + ("masked",))
        self.assertEqual(
            [DEFAULT_SLOT_NAMES[s] for s in SLOTS],
            ["Base", "Skin 2", "Skin 3", "Skin 4", "Skin 5", "Masked"],
        )

    def test_a_rank_unlocks_that_many_skins_and_masked_is_always_open(self) -> None:
        self.assertEqual([_slot_unlocked(s, 3) for s in SWAPPABLE_ORDER], [True, True, True, False, False])
        self.assertTrue(all(_slot_unlocked(s, 5) for s in SWAPPABLE_ORDER))
        self.assertTrue(_slot_unlocked("masked", 1))
        self.assertFalse(_slot_unlocked("extra_5", 9))


if __name__ == "__main__":
    unittest.main()
