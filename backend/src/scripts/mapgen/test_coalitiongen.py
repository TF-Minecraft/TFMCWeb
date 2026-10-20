import json
import os
import tempfile
import unittest
from unittest import mock

import numpy as np

from . import coalitiongen
from .coalitiongen import (
    FALLBACK_RGB,
    HATCH_ALPHA,
    HATCH_EDGE_RGBA,
    TARGET_WASH_RGBA,
    coalition_rows,
    color_mapping,
    compile_coalition_regions,
    paint_target_hatch,
)
from ..util.border_paint import INK_DARK
from ..util.display_colour import hover_rgb

NATIONS = {
    "Thalendor": {"id": "Thalendor", "name": "Thalendor", "rgb": "45,105,65", "provinces": [1, 2], "subjects": []},
    "FIG": {"id": "FIG", "name": "FIG", "rgb": "91,154,236", "provinces": [3], "subjects": ["Vassal"]},
    "Vassal": {"id": "Vassal", "name": "Little Vassal", "rgb": "1,2,3", "provinces": [4], "overlord": "FIG"},
    "TheHolyOrder": {
        "id": "TheHolyOrder",
        "name": "The Holy Order",
        "rgb": "169,69,219",
        "provinces": [5],
        "subjects": ["12"],
    },
    "12": {"id": "12", "name": "The Sanctuary", "rgb": "68,206,61", "provinces": [6], "overlord": "TheHolyOrder"},
}


def coalition(**overrides):
    row = {
        "id": "c1",
        "name": "Free Alliance",
        "leader": "Thalendor",
        "target": "TheHolyOrder",
        "offensive": False,
        "members": ["Thalendor", "FIG"],
    }
    row.update(overrides)
    return row


class CompileTests(unittest.TestCase):
    def test_the_plugin_upload_format(self) -> None:
        """The payload SimpleFactions sends, verbatim: faction ids, not names."""
        payload = {
            "coalitions": [
                {
                    "id": "c3f9a1b2c4d",
                    "name": "Free Alliance",
                    "rgb": "120,40,40",
                    "leader": "Thalendor",
                    "target": "TheHolyOrder",
                    "offensive": False,
                    "members": ["Thalendor", "FIG"],
                    "banner": ["WHITE.BASE", "RED.CROSS"],
                }
            ]
        }
        record = compile_coalition_regions(coalition_rows(payload), NATIONS)["c3f9a1b2c4d"]
        self.assertEqual(record["name"], "Free Alliance")
        self.assertEqual(record["rgb"], "120,40,40")
        self.assertEqual(record["target_name"], "The Holy Order")
        self.assertEqual(record["banner patterns"], ["WHITE.BASE", "RED.CROSS"])

    def test_a_region_is_every_members_realm(self) -> None:
        record = compile_coalition_regions([coalition()], NATIONS)["c1"]
        self.assertEqual(sorted(record["provinces"]), [1, 2, 3, 4])
        self.assertEqual(record["size"], 4)
        # No drill-down: a coalition is one shape, not an overlord.
        self.assertNotIn("overlord", record)
        self.assertNotIn("subjects", record)

    def test_members_are_listed_with_their_realms(self) -> None:
        members = compile_coalition_regions([coalition()], NATIONS)["c1"]["members"]
        self.assertEqual(
            members,
            [
                {"id": "Thalendor", "name": "Thalendor", "rgb": "45,105,65", "size": 2},
                {"id": "FIG", "name": "FIG", "rgb": "91,154,236", "size": 2},
            ],
        )

    def test_the_target_is_its_whole_realm(self) -> None:
        record = compile_coalition_regions([coalition()], NATIONS)["c1"]
        self.assertEqual(record["target"], "TheHolyOrder")
        self.assertEqual(record["target_rgb"], "169,69,219")
        self.assertEqual(record["target_provinces"], [5, 6])

    def test_colour_falls_back_to_the_leader(self) -> None:
        self.assertEqual(compile_coalition_regions([coalition()], NATIONS)["c1"]["rgb"], "45,105,65")

    def test_unusable_colours_fall_back_to_parchment_grey(self) -> None:
        record = compile_coalition_regions([coalition(leader="Nobody", members=[], rgb="300,0,0")], NATIONS)["c1"]
        self.assertEqual(record["rgb"], ",".join(map(str, FALLBACK_RGB)))

    def test_coalitions_never_share_a_colour(self) -> None:
        records = compile_coalition_regions(
            [coalition(rgb="10,10,10"), coalition(id="c2", leader="FIG", members=["FIG"], rgb="10,10,10")], NATIONS
        )
        self.assertEqual(records["c1"]["rgb"], "10,10,10")
        self.assertNotEqual(records["c2"]["rgb"], "10,10,10")

    def test_black_is_never_a_coalition_colour(self) -> None:
        self.assertNotEqual(compile_coalition_regions([coalition(rgb="0,0,0")], NATIONS)["c1"]["rgb"], "0,0,0")

    def test_ids_match_without_case_and_names_resolve(self) -> None:
        record = compile_coalition_regions(
            [coalition(leader="thalendor", members=["fig"], target="theholyorder")], NATIONS
        )["c1"]
        self.assertEqual(record["leader"], "Thalendor")
        self.assertEqual(record["leader_name"], "Thalendor")
        self.assertEqual(record["target_name"], "The Holy Order")
        self.assertEqual([m["name"] for m in record["members"]], ["Thalendor", "FIG"])

    def test_leader_counts_as_a_member(self) -> None:
        record = compile_coalition_regions([coalition(members=["FIG"])], NATIONS)["c1"]
        self.assertEqual([m["id"] for m in record["members"]], ["Thalendor", "FIG"])

    def test_unknown_members_keep_their_id_and_hold_no_land(self) -> None:
        record = compile_coalition_regions([coalition(members=["Thalendor", "Gone"])], NATIONS)["c1"]
        self.assertIn({"id": "Gone", "name": "Gone", "rgb": None, "size": 0}, record["members"])
        self.assertEqual(sorted(record["provinces"]), [1, 2])

    def test_first_coalition_keeps_a_shared_province(self) -> None:
        records = compile_coalition_regions(
            [coalition(), coalition(id="c2", leader="FIG", members=["FIG"], target="Thalendor")], NATIONS
        )
        self.assertEqual(records["c2"]["provinces"], [])
        self.assertEqual(records["c2"]["target_provinces"], [1, 2])

    def test_rows_without_an_id_or_repeated_are_dropped(self) -> None:
        records = compile_coalition_regions([coalition(id=""), coalition(), coalition(name="Again")], NATIONS)
        self.assertEqual([r["name"] for r in records.values()], ["Free Alliance"])

    def test_banner_falls_back_to_the_leaders(self) -> None:
        patterns = {"Thalendor": ["GREEN.BASE", "YELLOW.CASTLE"]}
        own = compile_coalition_regions([coalition(banner=["WHITE.BASE"])], NATIONS, patterns)["c1"]
        inherited = compile_coalition_regions([coalition(banner=None)], NATIONS, patterns)["c1"]
        self.assertEqual(own["banner patterns"], ["WHITE.BASE"])
        self.assertEqual(inherited["banner patterns"], ["GREEN.BASE", "YELLOW.CASTLE"])

    def test_subject_cycles_terminate(self) -> None:
        nations = {
            "A": {"rgb": "1,1,1", "provinces": [1], "subjects": ["B"]},
            "B": {"rgb": "2,2,2", "provinces": [2], "subjects": ["A"]},
        }
        record = compile_coalition_regions([coalition(leader="A", members=["A"], target="")], nations)["c1"]
        self.assertEqual(sorted(record["provinces"]), [1, 2])
        self.assertEqual(record["target_provinces"], [])

    def test_upload_shapes(self) -> None:
        self.assertEqual(coalition_rows({"coalitions": [{"id": "a"}, 3]}), [{"id": "a"}])
        self.assertEqual(coalition_rows([{"id": "a"}]), [{"id": "a"}])
        self.assertEqual(coalition_rows({"coalitions": None}), [])
        self.assertEqual(coalition_rows("nope"), [])


class ColorMappingTests(unittest.TestCase):
    def test_provinces_take_their_coalitions_colour(self) -> None:
        records = compile_coalition_regions([coalition()], NATIONS)
        with tempfile.TemporaryDirectory() as tmp:
            with open(os.path.join(tmp, "coalition.json"), "w", encoding="utf-8") as f:
                json.dump(records, f)
            provinces = {(9, 9, 1): 1, (9, 9, 3): 3, (9, 9, 5): 5}
            with mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, f)):
                mapping = color_mapping("main", provinces)
        self.assertEqual(mapping, {(9, 9, 1): (45, 105, 65), (9, 9, 3): (45, 105, 65)})

    def test_no_compiled_file_maps_nothing(self) -> None:
        with mock.patch.object(coalitiongen, "defines_file", lambda m, f: "/nonexistent/coalition.json"):
            self.assertEqual(color_mapping("main", {(1, 1, 1): 1}), {})


class TargetHatchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.ids = np.zeros((60, 120), dtype=np.uint16)
        self.ids[10:50, 40:100] = 5

    def test_stripes_wash_and_outline(self) -> None:
        img, meta = paint_target_hatch(self.ids, [5], (45, 105, 65))
        out = np.array(img)
        # Where the target's land starts, inside the crop.
        oy, ox = 10 - meta["y"], 40 - meta["x"]
        land = {tuple(px) for px in out[oy + 5 : oy + 35, ox + 5 : ox + 55].reshape(-1, 4)}
        self.assertIn((*hover_rgb((45, 105, 65)), HATCH_ALPHA), land)
        self.assertIn(HATCH_EDGE_RGBA, land)
        self.assertIn(TARGET_WASH_RGBA, land)
        # The ink outline sits just outside the land.
        self.assertEqual(tuple(out[oy + 20, ox - 1]), INK_DARK)

    def test_crop_box_is_on_the_full_map(self) -> None:
        _, meta = paint_target_hatch(self.ids, [5], (45, 105, 65))
        self.assertLessEqual(meta["x"], 40)
        self.assertLessEqual(meta["y"], 10)
        self.assertGreaterEqual(meta["x"] + meta["w"], 100)
        self.assertGreaterEqual(meta["y"] + meta["h"], 50)

    def test_no_land_no_overlay(self) -> None:
        self.assertIsNone(paint_target_hatch(self.ids, [], (1, 2, 3)))
        self.assertIsNone(paint_target_hatch(self.ids, [77], (1, 2, 3)))


class RunTests(unittest.TestCase):
    def _run(self, tmp: str, coalitions: list[dict]) -> dict:
        ids = np.zeros((40, 40), dtype=np.uint16)
        ids[5:20, 5:20] = 5
        cache = mock.Mock(province_id_map=ids)
        with (
            mock.patch.object(coalitiongen, "validate_map"),
            mock.patch.object(coalitiongen, "load_coalitions", return_value=coalitions),
            mock.patch.object(coalitiongen, "load_compiled_nations", return_value=NATIONS),
            mock.patch.object(coalitiongen, "load_banner_patterns", return_value={"Thalendor": ["GREEN.BASE"]}),
            mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, "defines", f)),
            mock.patch.object(coalitiongen, "region_image", lambda m, mode, f: os.path.join(tmp, "regions", f)),
            mock.patch.object(
                coalitiongen, "region_overlay_file", lambda m, mode: os.path.join(tmp, "regions", "overlays.json")
            ),
            mock.patch.object(coalitiongen, "banner_image", lambda m, mode, f: os.path.join(tmp, "banners", f)),
            mock.patch.object(coalitiongen, "create_banner") as banner,
            mock.patch.object(coalitiongen, "create_map") as create_map,
            mock.patch.object(coalitiongen, "generate_regions") as generate_regions,
        ):
            records = coalitiongen.run_coalition_mode("main", cache=cache)
        self.banner, self.create_map, self.generate_regions = banner, create_map, generate_regions
        return records

    def test_draws_the_mode_and_records_the_target_overlay(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self._run(tmp, [coalition()])
            with open(os.path.join(tmp, "defines", "coalition.json"), encoding="utf-8") as f:
                record = json.load(f)["c1"]
            self.assertEqual(record["banner"], "45_105_65")
            self.assertNotIn("banner patterns", record)
            self.assertEqual(record["target_path"], "45_105_65_target.png")
            self.assertTrue(os.path.isfile(os.path.join(tmp, "regions", "45_105_65_target.png")))
            self.assertEqual(set(record["target_overlay"]), {"x", "y", "w", "h"})
        self.banner.assert_called_once_with("main", "coalition", "45_105_65", ["GREEN.BASE"])
        self.create_map.assert_called_once()
        self.generate_regions.assert_called_once()

    def test_no_coalitions_clears_the_mode(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "regions"))
            stale = os.path.join(tmp, "regions", "1_2_3.png")
            open(stale, "wb").close()
            self._run(tmp, [])
            self.assertFalse(os.path.exists(stale))
            with open(os.path.join(tmp, "regions", "overlays.json"), encoding="utf-8") as f:
                self.assertEqual(json.load(f), {})
            with open(os.path.join(tmp, "defines", "coalition.json"), encoding="utf-8") as f:
                self.assertEqual(json.load(f), {})
        self.generate_regions.assert_not_called()


if __name__ == "__main__":
    unittest.main()
