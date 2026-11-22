"""Vehicle skins: one PNG per texture of the vehicle, exact sizes, ArmourShop file names."""

from __future__ import annotations

import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from src.skins import review_sheet, storage, submissions
from src.skins.base_sets import base_sets_by_kind
from src.skins.storage import StorageError, write_submission_files
from src.skins.submissions import (
    SubmissionError,
    _validate_base_set,
    _validate_vehicle_files,
    create_submission,
    texture_sha256,
)
from src.skins.vehicle_skins import (
    VEHICLE_KIND,
    VehicleSpec,
    VehicleTexture,
    texture_fields,
    texture_file_name,
    vehicle_specs,
)

_SHARED = Path(__file__).resolve().parents[3] / "shared" / "skins" / "vehicle_skins.json"


def png(width: int, height: int, colour=(200, 40, 40, 255)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (width, height), colour).save(buf, format="PNG")
    return buf.getvalue()


def painted(vehicle_id: str) -> dict[str, bytes]:
    spec = vehicle_specs()[vehicle_id]
    return {f"texture_{i}": png(t.width, t.height, (10 + i, 80, 160, 255)) for i, t in enumerate(spec.textures)}


class VehicleCatalogueTest(unittest.TestCase):
    def test_every_listed_vehicle_is_a_base_set_of_the_vehicle_kind(self) -> None:
        data = json.loads(_SHARED.read_text(encoding="utf-8"))
        ids = {row["id"] for row in data["vehicles"]}
        self.assertIn("karve", ids)
        self.assertEqual(base_sets_by_kind()[VEHICLE_KIND], frozenset(ids))
        self.assertEqual(_validate_base_set(VEHICLE_KIND, "karve"), "karve")
        with self.assertRaises(SubmissionError):
            _validate_base_set(VEHICLE_KIND, "swords")
        with self.assertRaises(SubmissionError):
            _validate_base_set("handheld", "karve")

    def test_specs_list_each_texture_in_model_order(self) -> None:
        for spec in vehicle_specs().values():
            self.assertTrue(spec.textures, spec.id)
            for texture in spec.textures:
                self.assertGreater(texture.width, 0)
                self.assertEqual(len(texture.sha256), 64)
        self.assertEqual(texture_fields("horse_cart"), ("texture_0", "texture_1"))
        self.assertEqual(texture_file_name("bob_ship", 1), "bob_ship_1.png")


class VehicleFileRulesTest(unittest.TestCase):
    def test_painted_textures_at_their_sizes_pass(self) -> None:
        _validate_vehicle_files("horse_cart", painted("horse_cart"))

    def test_missing_extra_wrong_size_and_animation_are_refused(self) -> None:
        files = painted("horse_cart")
        del files["texture_1"]
        with self.assertRaisesRegex(SubmissionError, "Missing files: texture_1"):
            _validate_vehicle_files("horse_cart", files)
        files = painted("horse_cart") | {"texture_2": png(16, 16)}
        with self.assertRaisesRegex(SubmissionError, "takes 2 texture"):
            _validate_vehicle_files("horse_cart", files)
        files = painted("horse_cart") | {"texture_0_mcmeta": b"{}"}
        with self.assertRaisesRegex(SubmissionError, "unexpected: texture_0_mcmeta"):
            _validate_vehicle_files("horse_cart", files)
        files = painted("horse_cart") | {"texture_1": png(48, 48)}
        with self.assertRaisesRegex(SubmissionError, "texture_1: PNG must be 16x16, got 48x48"):
            _validate_vehicle_files("horse_cart", files)
        files = painted("horse_cart") | {"texture_0": b"not a png"}
        with self.assertRaisesRegex(SubmissionError, "texture_0: File is not a valid PNG"):
            _validate_vehicle_files("horse_cart", files)

    def test_the_vehicles_own_textures_alone_are_not_a_skin(self) -> None:
        a, b = png(4, 4, (1, 2, 3, 255)), png(2, 2, (4, 5, 6, 255))
        spec = VehicleSpec(
            "toy",
            "Toy",
            (
                VehicleTexture(4, 4, hashlib.sha256(a).hexdigest()),
                VehicleTexture(2, 2, hashlib.sha256(b).hexdigest()),
            ),
        )
        with mock.patch("src.skins.submissions.vehicle_specs", return_value={"toy": spec}), mock.patch(
            "src.skins.submissions.texture_fields", return_value=("texture_0", "texture_1")
        ):
            with self.assertRaisesRegex(SubmissionError, "Paint at least one texture"):
                _validate_vehicle_files("toy", {"texture_0": a, "texture_1": b})
            # Keeping one original next to a painted one is fine.
            _validate_vehicle_files("toy", {"texture_0": a, "texture_1": png(2, 2)})

    def test_duplicate_check_hashes_every_vehicle_texture(self) -> None:
        files = painted("horse_cart")
        first = texture_sha256(files)
        self.assertNotEqual(first, texture_sha256(files | {"texture_1": png(16, 16, (1, 1, 1, 255))}))
        self.assertEqual(first, texture_sha256(dict(files)))
        self.assertEqual(texture_sha256({"texture": b"x"}), hashlib.sha256(b"x").hexdigest())


class VehicleSubmissionLaneTest(unittest.TestCase):
    def _create(self, *, staff: bool, kinds: list[str]):
        session = {"code_id": 1, "player_uuid": "p-1", "staff": staff, "realm_id": "main"}
        entitlements = {
            "name_colour_stops": 0,
            "max_3d_pair_bytes": 30720,
            "skin_kinds": kinds,
            "allow_armor_3d_helmet": False,
        }
        with mock.patch.object(submissions, "_assert_no_active_submission_for_code"), mock.patch.object(
            submissions, "resolve_web_entitlements", return_value=entitlements
        ):
            return create_submission(session, VEHICLE_KIND, "Sea Wolf", painted("karve"), base_set="karve")

    def test_staff_codes_cannot_make_vehicle_skins(self) -> None:
        with self.assertRaisesRegex(SubmissionError, "made by players, not with a staff code"):
            self._create(staff=True, kinds=[])

    def test_ranks_without_the_vehicle_kind_are_refused(self) -> None:
        with self.assertRaisesRegex(SubmissionError, "cannot upload kind 'vehicle'"):
            self._create(staff=False, kinds=["handheld", "armor_set"])


class VehicleStorageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.skins = Path(self.tmp.name) / "skins"
        self._orig = (storage.SKINS_DIR, review_sheet.SKINS_DIR)
        storage.SKINS_DIR = self.skins
        review_sheet.SKINS_DIR = self.skins

    def tearDown(self) -> None:
        storage.SKINS_DIR, review_sheet.SKINS_DIR = self._orig
        self.tmp.cleanup()

    def test_textures_are_written_with_armourshop_names(self) -> None:
        files = painted("horse_cart")
        out = write_submission_files("bob_cart", "bob_cart", VEHICLE_KIND, "Cart", files, base_set="horse_cart")
        self.assertEqual(sorted(p.name for p in out.iterdir()), ["bob_cart_0.png", "bob_cart_1.png", "meta.json"])
        self.assertEqual((out / "bob_cart_1.png").read_bytes(), files["texture_1"])
        meta = json.loads((out / "meta.json").read_text(encoding="utf-8"))
        self.assertEqual((meta["kind"], meta["base_set"]), ("vehicle", "horse_cart"))

    def test_bad_vehicle_files_leave_nothing_behind(self) -> None:
        with self.assertRaisesRegex(StorageError, "Unknown vehicle: zeppelin"):
            write_submission_files("x", "x", VEHICLE_KIND, "X", painted("karve"), base_set="zeppelin")
        with self.assertRaisesRegex(StorageError, "cannot be animated"):
            write_submission_files(
                "x", "x", VEHICLE_KIND, "X", painted("karve") | {"texture_0_mcmeta": b"{}"}, base_set="karve"
            )
        with self.assertRaisesRegex(StorageError, "PNG must be 128x128"):
            write_submission_files("x", "x", VEHICLE_KIND, "X", {"texture_0": png(64, 64)}, base_set="karve")
        self.assertFalse((self.skins / "x").exists())

    def test_review_sheet_shows_every_texture(self) -> None:
        write_submission_files("bob_cart", "bob_cart", VEHICLE_KIND, "Cart", painted("horse_cart"), base_set="horse_cart")
        body = review_sheet._vehicle_body("bob_cart", "horse_cart", self.skins / "bob_cart")
        cell = review_sheet.VEHICLE_DISPLAY + review_sheet.PAD * 2
        self.assertEqual(body.width, 2 * cell)
        with self.assertRaises(review_sheet.ReviewSheetError):
            review_sheet._vehicle_body("bob_cart", "zeppelin", self.skins / "bob_cart")
        (self.skins / "bob_cart" / "bob_cart_1.png").unlink()
        with self.assertRaisesRegex(review_sheet.ReviewSheetError, "Missing file: bob_cart_1.png"):
            review_sheet._vehicle_body("bob_cart", "horse_cart", self.skins / "bob_cart")


if __name__ == "__main__":
    unittest.main()
