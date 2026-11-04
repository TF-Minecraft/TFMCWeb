"""Wardrobe slot count comes from TFMCWeb's web_entitlements."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pytest

from src import database

pytestmark = pytest.mark.usefixtures("postgres")

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))
_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

NOW = "2026-01-01T00:00:00Z"
PLAYER = "wardrobe-ent-player"
CHAR_ID = "char-wardrobe-ent"
CREATE_ID = "create-wardrobe-ent"


class WardrobeEntitlementsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        root = Path(self.tmp.name)

        import skins.db as db_mod

        self._db_mod = db_mod
        sys.modules["src.skins.db"] = db_mod
        self._orig_data = db_mod.DATA_DIR
        self._orig_drinks = db_mod.DRINKS_DIR
        self._orig_skins = db_mod.SKINS_DIR
        self._orig_wardrobe = db_mod.WARDROBE_DIR
        db_mod.DATA_DIR = root
        db_mod.DRINKS_DIR = root / "drinks"
        db_mod.SKINS_DIR = root / "skins"
        db_mod.WARDROBE_DIR = root / "wardrobe"
        db_mod.ensure_directories()
        from src.characters import wardrobe

        paths = patch.multiple(wardrobe, DATA_DIR=root, WARDROBE_DIR=root / "wardrobe")
        paths.start()
        self.addCleanup(paths.stop)

        from src.characters.web_entitlements import upsert_web_entitlements

        upsert_web_entitlements(
            {
                "player_uuid": PLAYER,
                "name_colour_stops": 0,
                "allow_drink_texture": False,
                "max_alive_characters": 3,
                "wardrobe_skin_slots": 3,
                "max_3d_pair_bytes": 30720,
                "skin_token_cooldown_days": -1,
                "skin_kinds": [],
                "allow_armor_3d_helmet": False,
            }
        )

        with database.connect() as conn:
            conn.execute(
                """
                INSERT INTO character_roster (
                    player_uuid, realm_id, character_id, name, status, updated_at
                ) VALUES (%s, 'main', %s, 'Test', 'ALIVE', %s)
                """,
                (PLAYER, CHAR_ID, NOW),
            )
            conn.execute(
                """
                INSERT INTO character_creation_requests (
                    id, player_uuid, payload, status, created_at, realm_id
                ) VALUES (%s, %s, '{}', 'pending', %s, 'main')
                """,
                (CREATE_ID, PLAYER, NOW),
            )

    def tearDown(self) -> None:
        db_mod = self._db_mod
        db_mod.DATA_DIR = self._orig_data
        db_mod.DRINKS_DIR = self._orig_drinks
        db_mod.SKINS_DIR = self._orig_skins
        db_mod.WARDROBE_DIR = self._orig_wardrobe
        self.tmp.cleanup()

    def test_live_wardrobe_uses_rpc_slots_not_roster_meta(self) -> None:
        from src.characters.wardrobe import get_wardrobe

        out = get_wardrobe(PLAYER, CHAR_ID)
        self.assertEqual(out["swappable_slots"], 3)
        by_slot = {s["slot"]: s for s in out["slots"]}
        self.assertTrue(by_slot["extra_1"]["unlocked"])
        self.assertTrue(by_slot["extra_2"]["unlocked"])

    def test_pending_wardrobe_uses_rpc_slots(self) -> None:
        from src.characters.wardrobe import enforce_pending_wardrobe_slot_limits

        swappable = enforce_pending_wardrobe_slot_limits(PLAYER, CREATE_ID)
        self.assertEqual(swappable, 3)


    def _entitle(self, slots: int) -> None:
        from src.characters.web_entitlements import upsert_web_entitlements

        upsert_web_entitlements(
            {
                "player_uuid": PLAYER,
                "name_colour_stops": 0,
                "allow_drink_texture": False,
                "max_alive_characters": 3,
                "wardrobe_skin_slots": slots,
                "max_3d_pair_bytes": 30720,
                "skin_token_cooldown_days": -1,
                "skin_kinds": [],
                "allow_armor_3d_helmet": False,
            }
        )

    def _put_slot(self, slot: str) -> Path:
        from src.characters import wardrobe

        rel = f"wardrobe/{PLAYER}/{CHAR_ID}/{slot}.png"
        path = wardrobe.DATA_DIR / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"png")
        with database.connect() as conn:
            conn.execute(
                """
                INSERT INTO character_wardrobe_slots (
                    player_uuid, character_id, slot, png_relpath, texture_value,
                    texture_signature, apply_pending, updated_at
                ) VALUES (%s, %s, %s, %s, 'v', 's', false, %s)
                """,
                (PLAYER, CHAR_ID, slot, rel, NOW),
            )
        return path

    def _set_worn(self, slot: str) -> None:
        with database.connect() as conn:
            conn.execute(
                "UPDATE character_roster SET wardrobe_active_slot = %s WHERE character_id = %s",
                (slot, CHAR_ID),
            )

    def test_ranks_unlock_up_to_five_skins(self) -> None:
        from src.characters.wardrobe import get_wardrobe

        self._entitle(5)
        out = get_wardrobe(PLAYER, CHAR_ID)
        self.assertEqual(out["swappable_slots"], 5)
        self.assertEqual(
            [(s["slot"], s["unlocked"], s["display_name"]) for s in out["slots"]],
            [
                ("base", True, "Base"),
                ("extra_1", True, "Skin 2"),
                ("extra_2", True, "Skin 3"),
                ("extra_3", True, "Skin 4"),
                ("extra_4", True, "Skin 5"),
                ("masked", True, "Masked"),
            ],
        )
        self._entitle(9)
        self.assertEqual(get_wardrobe(PLAYER, CHAR_ID)["swappable_slots"], 5)

    def test_skins_in_locked_slots_stay_saved_and_the_worn_one_moves_to_base(self) -> None:
        from src.characters.wardrobe import get_wardrobe, get_wardrobe_for_plugin

        self._entitle(5)
        files = [self._put_slot(slot) for slot in ("base", "extra_1", "extra_2", "extra_3")]
        self._set_worn("extra_3")

        self._entitle(2)
        out = get_wardrobe_for_plugin(PLAYER, CHAR_ID)
        by_slot = {s["slot"]: s for s in out["slots"]}
        self.assertEqual(out["active_slot"], "base")
        self.assertEqual(
            [(by_slot[k]["unlocked"], by_slot[k]["filled"]) for k in ("base", "extra_1", "extra_2", "extra_3")],
            [(True, True), (True, True), (False, True), (False, True)],
        )
        self.assertTrue(all(path.is_file() for path in files))

        self._entitle(5)
        back = {s["slot"]: s for s in get_wardrobe(PLAYER, CHAR_ID)["slots"]}
        self.assertTrue(back["extra_3"]["unlocked"] and back["extra_3"]["filled"])

    def test_locked_slots_refuse_renames_and_the_worn_skin(self) -> None:
        from src.characters.wardrobe import WardrobeError, set_active_slot, set_slot_display_name

        self._entitle(5)
        self._put_slot("base")
        self._put_slot("extra_1")
        self._entitle(1)
        with self.assertRaises(WardrobeError) as worn:
            set_active_slot(PLAYER, CHAR_ID, "extra_1")
        self.assertEqual(worn.exception.status_code, 403)
        with self.assertRaises(WardrobeError) as rename:
            set_slot_display_name(PLAYER, CHAR_ID, "extra_1", "Coat")
        self.assertEqual(rename.exception.status_code, 403)

    def test_clearing_a_kept_skin_deletes_it(self) -> None:
        from src.characters.wardrobe import clear_slot

        self._entitle(5)
        self._put_slot("base")
        kept = self._put_slot("extra_1")
        self._entitle(1)
        out = clear_slot(PLAYER, CHAR_ID, "extra_1")
        self.assertFalse(kept.exists())
        self.assertFalse({s["slot"]: s for s in out["slots"]}["extra_1"]["filled"])

    def test_pending_skins_in_locked_slots_stay_saved(self) -> None:
        from src.characters.wardrobe import enforce_pending_wardrobe_slot_limits

        with database.connect() as conn:
            conn.execute(
                """
                INSERT INTO character_creation_wardrobe (
                    create_id, slot, png_relpath, texture_value, texture_signature, updated_at
                ) VALUES (%s, 'extra_2', 'wardrobe/pending/x/extra_2.png', 'v', 's', %s)
                """,
                (CREATE_ID, NOW),
            )
        self._entitle(1)
        self.assertEqual(enforce_pending_wardrobe_slot_limits(PLAYER, CREATE_ID), 1)
        with database.connect() as conn:
            kept = conn.execute(
                "SELECT count(*) AS n FROM character_creation_wardrobe WHERE create_id = %s", (CREATE_ID,)
            ).fetchone()["n"]
        self.assertEqual(kept, 1)

if __name__ == "__main__":
    unittest.main()
