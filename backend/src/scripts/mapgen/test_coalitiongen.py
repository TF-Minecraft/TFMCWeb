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
    OUTLINE_RGBA,
    TARGET_WASH_ALPHA,
    coalition_rows,
    compile_coalition_map,
    paint_coalition_overlay,
)

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
        "banner": ["white.base"],
    }
    row.update(overrides)
    return row


def by_id(compiled):
    return {row["id"]: row for row in compiled["provinces"]}


class CompileTests(unittest.TestCase):
    def test_members_bring_their_subjects(self) -> None:
        provinces = by_id(compile_coalition_map([coalition()], NATIONS))
        self.assertEqual(provinces[4]["coalition"], "c1")
        self.assertEqual(provinces[4]["member"], "FIG")
        self.assertEqual(provinces[4]["owner"], "Vassal")
        self.assertEqual({p for p, row in provinces.items() if row.get("coalition")}, {1, 2, 3, 4})

    def test_target_realm_includes_its_subjects(self) -> None:
        provinces = by_id(compile_coalition_map([coalition()], NATIONS))
        self.assertEqual(provinces[5]["targeted_by"], ["c1"])
        self.assertEqual(provinces[6]["targeted_by"], ["c1"])
        self.assertNotIn("coalition", provinces[6])

    def test_colour_falls_back_to_the_leader(self) -> None:
        compiled = compile_coalition_map([coalition()], NATIONS)
        self.assertEqual(compiled["coalitions"][0]["rgb"], "45,105,65")

    def test_own_colour_wins_over_the_leader(self) -> None:
        compiled = compile_coalition_map([coalition(rgb="120,40,40")], NATIONS)
        self.assertEqual(compiled["coalitions"][0]["rgb"], "120,40,40")

    def test_unusable_colours_fall_back_to_parchment_grey(self) -> None:
        compiled = compile_coalition_map([coalition(leader="Nobody", rgb="300,0,0")], NATIONS)
        self.assertEqual(compiled["coalitions"][0]["rgb"], ",".join(map(str, FALLBACK_RGB)))

    def test_ids_match_without_case_and_names_resolve(self) -> None:
        compiled = compile_coalition_map([coalition(leader="thalendor", members=["fig"], target="theholyorder")], NATIONS)
        row = compiled["coalitions"][0]
        self.assertEqual(row["leader"], "Thalendor")
        self.assertEqual(row["target_name"], "The Holy Order")
        self.assertEqual([m["name"] for m in row["members"]], ["Thalendor", "FIG"])

    def test_leader_counts_as_a_member(self) -> None:
        compiled = compile_coalition_map([coalition(members=["FIG"])], NATIONS)
        self.assertEqual([m["id"] for m in compiled["coalitions"][0]["members"]], ["Thalendor", "FIG"])

    def test_unknown_members_keep_their_id_and_paint_nothing(self) -> None:
        compiled = compile_coalition_map([coalition(members=["Thalendor", "Gone"])], NATIONS)
        self.assertIn({"id": "Gone", "name": "Gone"}, compiled["coalitions"][0]["members"])
        self.assertEqual({row["id"] for row in compiled["provinces"] if row.get("coalition")}, {1, 2})

    def test_first_coalition_keeps_a_shared_province(self) -> None:
        compiled = compile_coalition_map(
            [coalition(), coalition(id="c2", leader="FIG", members=["FIG"], target="Thalendor")], NATIONS
        )
        provinces = by_id(compiled)
        self.assertEqual(provinces[3]["coalition"], "c1")
        self.assertEqual(provinces[1]["targeted_by"], ["c2"])

    def test_two_coalitions_can_share_a_target(self) -> None:
        compiled = compile_coalition_map(
            [coalition(), coalition(id="c2", leader="FIG", members=["FIG"])], NATIONS
        )
        self.assertEqual(by_id(compiled)[5]["targeted_by"], ["c1", "c2"])

    def test_rows_without_an_id_or_repeated_are_dropped(self) -> None:
        compiled = compile_coalition_map([coalition(id=""), coalition(), coalition(name="Again")], NATIONS)
        self.assertEqual([c["name"] for c in compiled["coalitions"]], ["Free Alliance"])

    def test_subject_cycles_terminate(self) -> None:
        nations = {
            "A": {"rgb": "1,1,1", "provinces": [1], "subjects": ["B"]},
            "B": {"rgb": "2,2,2", "provinces": [2], "subjects": ["A"]},
        }
        compiled = compile_coalition_map([coalition(leader="A", members=["A"], target="")], nations)
        self.assertEqual({row["id"] for row in compiled["provinces"]}, {1, 2})

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
        compiled = compile_coalition_map(coalition_rows(payload), NATIONS)
        row = compiled["coalitions"][0]
        self.assertEqual(row["id"], "c3f9a1b2c4d")
        self.assertEqual(row["rgb"], "120,40,40")
        self.assertEqual(row["target_name"], "The Holy Order")
        self.assertEqual(row["banner"], ["WHITE.BASE", "RED.CROSS"])
        self.assertEqual(by_id(compiled)[4]["coalition"], "c3f9a1b2c4d")

    def test_upload_shapes(self) -> None:
        self.assertEqual(coalition_rows({"coalitions": [{"id": "a"}, 3]}), [{"id": "a"}])
        self.assertEqual(coalition_rows([{"id": "a"}]), [{"id": "a"}])
        self.assertEqual(coalition_rows({"coalitions": None}), [])
        self.assertEqual(coalition_rows("nope"), [])


class PaintTests(unittest.TestCase):
    def setUp(self) -> None:
        # Columns 0-19: Thalendor (1), 20-39: FIG (3), 40-79: Holy Order (5),
        # 80-99: unclaimed (7). Row 0 is the map edge.
        self.ids = np.zeros((40, 100), dtype=np.int32)
        self.ids[:, 0:20] = 1
        self.ids[:, 20:40] = 3
        self.ids[:, 40:80] = 5
        self.ids[:, 80:100] = 7

    def test_nothing_paints_without_coalitions(self) -> None:
        out = paint_coalition_overlay(self.ids, {"coalitions": [], "provinces": []})
        self.assertEqual(out[:, :, 3].max(), 0)

    def test_members_fill_target_hatches_rest_stays_clear(self) -> None:
        compiled = compile_coalition_map([coalition()], NATIONS)
        out = paint_coalition_overlay(self.ids, compiled)
        fill = compiled["coalitions"][0]["fill_rgba"]
        hatch = compiled["coalitions"][0]["hatch_rgba"]

        self.assertEqual(list(out[20, 10]), fill)
        self.assertEqual(out[:, 80:, 3].max(), 0)

        target = out[5:35, 45:75].reshape(-1, 4)
        alphas = {int(a) for a in target[:, 3]}
        self.assertEqual(alphas, {TARGET_WASH_ALPHA, HATCH_ALPHA, HATCH_EDGE_RGBA[3]})
        stripes = target[target[:, 3] == HATCH_ALPHA]
        self.assertTrue((stripes[:, :3] == fill[:3]).all())
        self.assertNotEqual(hatch[:3], fill[:3])

    def test_coalition_and_target_are_outlined(self) -> None:
        compiled = compile_coalition_map([coalition()], NATIONS)
        out = paint_coalition_overlay(self.ids, compiled)
        hatch = compiled["coalitions"][0]["hatch_rgba"]
        # The coalition's edge against the target and the map edge.
        self.assertEqual(tuple(out[20, 39]), OUTLINE_RGBA)
        self.assertEqual(tuple(out[0, 10]), OUTLINE_RGBA)
        # The target's own ring, beside it.
        self.assertEqual(list(out[20, 40]), hatch)

    def test_a_seam_marks_realms_inside_a_coalition(self) -> None:
        compiled = compile_coalition_map([coalition()], NATIONS)
        out = paint_coalition_overlay(self.ids, compiled)
        fill = compiled["coalitions"][0]["fill_rgba"]
        seam = out[20, 19]
        self.assertEqual(seam[3], fill[3])
        self.assertLess(int(seam[:3].sum()), sum(fill[:3]))

    def test_shared_targets_stripe_both_colours(self) -> None:
        compiled = compile_coalition_map(
            [coalition(rgb="200,40,40"), coalition(id="c2", leader="Nobody", members=[], rgb="40,40,200")], NATIONS
        )
        out = paint_coalition_overlay(self.ids, compiled)
        stripes = {tuple(c["fill_rgba"][:3]) for c in compiled["coalitions"]}
        # Inside the target's outline ring, which is drawn in the first claimant's ink.
        target = {tuple(px[:3]) for px in out[3:37, 43:77].reshape(-1, 4) if px[3] == HATCH_ALPHA}
        self.assertEqual(target, stripes)


class CreateTests(unittest.TestCase):
    def test_writes_compiled_json_and_png(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            paths = {
                "input": os.path.join(tmp, "input", "main", "coalitions.json"),
                "nation": os.path.join(tmp, "defines", "main", "nation.json"),
                "compiled": os.path.join(tmp, "defines", "main", "coalition_map.json"),
                "png": os.path.join(tmp, "output", "main", "maps", "coalition_map.png"),
            }
            for key in ("input", "nation"):
                os.makedirs(os.path.dirname(paths[key]), exist_ok=True)
            with open(paths["input"], "w", encoding="utf-8") as f:
                json.dump({"coalitions": [coalition()]}, f)
            with open(paths["nation"], "w", encoding="utf-8") as f:
                json.dump(NATIONS, f)

            ids = np.ones((8, 8), dtype=np.int32)
            cache = mock.Mock(province_id_map=ids)
            with (
                mock.patch.object(coalitiongen, "validate_map"),
                mock.patch.object(coalitiongen, "input_file", lambda m, f: os.path.join(tmp, "input", m, f)),
                mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, "defines", m, f)),
                mock.patch.object(coalitiongen, "map_image", lambda m, f: paths["png"]),
            ):
                coalitiongen.create_coalition_map("main", cache=cache)

            with open(paths["compiled"], encoding="utf-8") as f:
                compiled = json.load(f)
            self.assertEqual(compiled["coalitions"][0]["name"], "Free Alliance")
            self.assertTrue(os.path.isfile(paths["png"]))

    def test_an_unchanged_map_is_not_repainted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            png = os.path.join(tmp, "coalition_map.png")
            with (
                mock.patch.object(coalitiongen, "validate_map"),
                mock.patch.object(coalitiongen, "load_coalitions", return_value=[coalition()]),
                mock.patch.object(coalitiongen, "load_compiled_nations", return_value=NATIONS),
                mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, f)),
                mock.patch.object(coalitiongen, "map_image", lambda m, f: png),
                mock.patch.object(coalitiongen, "_province_id_map", return_value=np.ones((4, 4), dtype=np.int32)),
                mock.patch.object(
                    coalitiongen, "paint_coalition_overlay", wraps=coalitiongen.paint_coalition_overlay
                ) as paint,
            ):
                coalitiongen.create_coalition_map("main")
                coalitiongen.create_coalition_map("main")
                self.assertEqual(paint.call_count, 1)

                os.remove(png)
                coalitiongen.create_coalition_map("main")
                self.assertEqual(paint.call_count, 2)

                with mock.patch.object(coalitiongen, "load_coalitions", return_value=[coalition(name="Renamed")]):
                    coalitiongen.create_coalition_map("main")
                self.assertEqual(paint.call_count, 3)

    def test_skips_only_uploads_with_an_unchanged_map(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            png = os.path.join(tmp, "coalition_map.png")
            regen_cache = mock.Mock(province_id_map=np.ones((4, 4), dtype=np.int32))
            with (
                mock.patch.object(coalitiongen, "validate_map"),
                mock.patch.object(coalitiongen, "load_coalitions", return_value=[coalition()]),
                mock.patch.object(coalitiongen, "load_compiled_nations", return_value=NATIONS),
                mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, f)),
                mock.patch.object(coalitiongen, "map_image", lambda m, f: png),
                mock.patch.object(coalitiongen, "_province_id_map", return_value=np.ones((4, 4), dtype=np.int32)),
                mock.patch.object(
                    coalitiongen, "paint_coalition_overlay", wraps=coalitiongen.paint_coalition_overlay
                ) as paint,
            ):
                coalitiongen.create_coalition_map("main")
                coalitiongen.create_coalition_map("main")
                self.assertEqual(paint.call_count, 1)
                # A regeneration repaints even when nothing compiled changed.
                coalitiongen.create_coalition_map("main", cache=regen_cache)
                self.assertEqual(paint.call_count, 2)

    def test_a_failed_paint_is_retried_by_the_next_upload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            png = os.path.join(tmp, "coalition_map.png")
            with open(png, "wb") as f:
                f.write(b"stale")
            with (
                mock.patch.object(coalitiongen, "validate_map"),
                mock.patch.object(coalitiongen, "load_coalitions", return_value=[coalition()]),
                mock.patch.object(coalitiongen, "load_compiled_nations", return_value=NATIONS),
                mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, f)),
                mock.patch.object(coalitiongen, "map_image", lambda m, f: png),
                mock.patch.object(coalitiongen, "_province_id_map", return_value=np.ones((4, 4), dtype=np.int32)),
            ):
                with mock.patch.object(coalitiongen, "paint_coalition_overlay", side_effect=MemoryError):
                    with self.assertRaises(MemoryError):
                        coalitiongen.create_coalition_map("main")
                coalitiongen.create_coalition_map("main")
            with open(png, "rb") as f:
                self.assertNotEqual(f.read(), b"stale")

    def test_tooltip_summary_names_coalition_member_and_targeters(self) -> None:
        compiled = compile_coalition_map(
            [coalition(offensive=True), coalition(id="c2", name="Eastern Pact", leader="FIG", members=["FIG"])],
            NATIONS,
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "coalition_map.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(compiled, f)
            with mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, f)):
                summary = coalitiongen.load_coalition_by_province("main")
        self.assertEqual(
            summary[4],
            {
                "coalition": "Free Alliance",
                "coalition_member": "FIG",
                "coalition_leader": "Thalendor",
                "coalition_target": "The Holy Order",
                "coalition_offensive": True,
            },
        )
        self.assertEqual(summary[6], {"coalition_targeted_by": ["Free Alliance", "Eastern Pact"]})
        self.assertNotIn(7, summary)

    def test_tooltip_summary_without_a_compiled_map_is_empty(self) -> None:
        with mock.patch.object(coalitiongen, "defines_file", lambda m, f: "/nonexistent/coalition_map.json"):
            self.assertEqual(coalitiongen.load_coalition_by_province("main"), {})

    def test_missing_upload_writes_an_empty_map(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with (
                mock.patch.object(coalitiongen, "validate_map"),
                mock.patch.object(coalitiongen, "input_file", lambda m, f: os.path.join(tmp, "nope", f)),
                mock.patch.object(coalitiongen, "defines_file", lambda m, f: os.path.join(tmp, "defines", f)),
                mock.patch.object(coalitiongen, "map_image", lambda m, f: os.path.join(tmp, "out.png")),
            ):
                coalitiongen.create_coalition_map("main", cache=mock.Mock(province_id_map=np.zeros((4, 4), dtype=np.int32)))
            with open(os.path.join(tmp, "defines", "coalition_map.json"), encoding="utf-8") as f:
                self.assertEqual(json.load(f), {"coalitions": [], "provinces": []})


if __name__ == "__main__":
    unittest.main()
