"""Tests for the start-of-week against end-of-week plugin comparison."""

from __future__ import annotations

import re
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes import weekly  # noqa: E402

_JUGGERNAUT_OLD = """
display:
  name: '&6Juggernaut'
max-level: 6
attributes:
  max_health:
    base: 30
    per-level: 0.45
  damage-reduction:
    base: 15
skills:
  BULWARK:
    level: 2
"""
_JUGGERNAUT_NEW = _JUGGERNAUT_OLD.replace("base: 30", "base: 28").replace("0.45", "0.4").replace(
    "base: 15", "base: 12"
)
_SKILLS = """
BULWARK:
  name: Bulwark
UNBROKEN:
  name: Unbroken
"""


def _snapshot(files: dict[str, str], jars: dict[str, tuple[str, str]] | None = None) -> weekly.Snapshot:
    return weekly.Snapshot(files=dict(files), jars=dict(jars or {}))


class TrackedFilesTest(unittest.TestCase):
    def test_runtime_state_and_submissions_are_ignored(self) -> None:
        self.assertTrue(weekly.tracked_config("MMOCore/classes/juggernaut.yml"))
        self.assertFalse(weekly.tracked_config("TFMCCore/tfmc-cooldowns.yml"))
        self.assertFalse(weekly.tracked_config("activity/reward-lock.yml"))
        self.assertFalse(weekly.tracked_config("ItemsAdder/contents/tfmc_submissions/configs/hat.yml"))
        self.assertFalse(weekly.tracked_config("Archaeo/sites/345f77c2-c1e1-4931-b183-9410ab7ef362.yml"))
        self.assertFalse(weekly.tracked_config("Cooking/data/animals.yml"))
        self.assertFalse(weekly.tracked_config("Archaeo/ownership/journals/17948.yml"))
        self.assertFalse(weekly.tracked_config("CompanionPets/estates/345f77c2-0.yml"))
        self.assertFalse(weekly.tracked_config("config.yml"))
        self.assertFalse(weekly.tracked_config("MMOItems/item/helper_miscellanea.yml"))
        self.assertTrue(weekly.tracked_config("MMOItems/item/staff.yml"))

    def test_hidden_words_never_reach_the_facts(self) -> None:
        facts = {
            "files": [
                {"path": "Magic/moonpath/pool.yml", "plugin": "Magic", "kind": "added",
                 "entries": [{"name": "pool", "kind": "added", "details": []}]},
                {"path": "MMOItems/item/robes.yml", "plugin": "MMOItems", "kind": "changed", "entries": [
                    {"name": "Moonpath Robes", "kind": "added", "details": []},
                    {"name": "Mage Robes", "kind": "changed",
                     "details": ["required-class: [Mage] --> [Invoker, Moonpathers]"]},
                ]},
            ],
            "plugins": [{"plugin": "Magic", "commits": ["Add the moonpath", "Cheaper casts"]},
                        {"plugin": "Paper", "old": "1", "new": "2"}],
            "hidden": {"Magic": 2},
        }
        hidden = weekly.hide(facts, re.compile("moonpath", re.IGNORECASE))
        self.assertEqual(hidden["hidden"], {"Magic": 3, "MMOItems": 1})
        self.assertEqual([item["path"] for item in hidden["files"]], ["MMOItems/item/robes.yml"])
        self.assertEqual(hidden["files"][0]["entries"], [
            {"name": "Mage Robes", "kind": "changed", "details": ["required-class: [Mage] --> [Invoker, (hidden)]"]},
        ])
        self.assertEqual([item.get("commits") for item in hidden["plugins"]], [["Cheaper casts"], None])

    def test_discoveries_are_hidden(self) -> None:
        self.assertTrue(weekly.hidden_config("Codex/categories/poi.yml"))
        self.assertTrue(weekly.hidden_config("MMOItems/item/research.yml"))
        self.assertFalse(weekly.hidden_config("MMOItems/item/sword.yml"))


class JarEntryTest(unittest.TestCase):
    def test_versioned_jar_names(self) -> None:
        self.assertEqual(weekly.jar_entry("rpcharacters-2.12.6.jar"), ("rpcharacters", "rpcharacters", "2.12.6"))
        self.assertEqual(weekly.jar_entry("MCPets-4.1.11.jar"), ("mcpets", "MCPets", "4.1.11"))
        self.assertEqual(weekly.jar_entry("MMOCore-1.13.1-SNAPSHOT.jar")[2], "1.13.1-SNAPSHOT")

    def test_unversioned_and_non_jars(self) -> None:
        self.assertEqual(weekly.jar_entry("ProtocolLib.jar"), ("protocollib", "ProtocolLib", ""))
        self.assertIsNone(weekly.jar_entry("notes.txt"))


class CompareTest(unittest.TestCase):
    def test_class_file_reports_final_numbers_under_its_name(self) -> None:
        base = _snapshot({"MMOCore/classes/juggernaut.yml": _JUGGERNAUT_OLD, "MythicLib/skill/tfmc.yml": _SKILLS})
        current = _snapshot({"MMOCore/classes/juggernaut.yml": _JUGGERNAUT_NEW, "MythicLib/skill/tfmc.yml": _SKILLS})
        facts = weekly.compare(base, current)
        self.assertEqual(len(facts["files"]), 1)
        entry = facts["files"][0]["entries"][0]
        self.assertEqual(entry["name"], "Juggernaut")
        self.assertIn("attributes.max_health.base: 30 --> 28", entry["details"])
        self.assertIn("attributes.max_health.per-level: 0.45 --> 0.4", entry["details"])
        self.assertIn("attributes.damage-reduction.base: 15 --> 12", entry["details"])

    def test_new_skills_use_their_player_names(self) -> None:
        new = _JUGGERNAUT_OLD + "  UNBROKEN:\n    level: 2\n"
        base = _snapshot({"MMOCore/classes/juggernaut.yml": _JUGGERNAUT_OLD, "MythicLib/skill/tfmc.yml": _SKILLS})
        current = _snapshot({"MMOCore/classes/juggernaut.yml": new, "MythicLib/skill/tfmc.yml": _SKILLS})
        details = weekly.compare(base, current)["files"][0]["entries"][0]["details"]
        self.assertEqual(details, ["skills.Unbroken: added (level=2)"])

    def test_limited_skill_values_show_what_players_see_at_level_one(self) -> None:
        old = """
display: {name: Templar}
skills:
  A: {cooldown: {base: 21.0, per-level: -1, max: 20.0}, heal: {base: 3, per-level: 1}}
  B: {cooldown: {base: 12, max: 10}}
  C: {duration: {base: 1, min: 2}}
"""
        new = old.replace("21.0", "18.0").replace("max: 20.0", "max: 17.0").replace("base: 3,", "base: 4,")
        new = new.replace("base: 12", "base: 11").replace("min: 2", "min: 2.5")
        new += "  D: {level: 3, heal: {base: 9, max: 8}, mana: {base: 5}}\n  E: {base: 4, max: 3}\n"
        path = "MMOCore/classes/templar.yml"
        details = weekly.compare(_snapshot({path: old}), _snapshot({path: new}))["files"][0]["entries"][0]["details"]
        self.assertEqual(details, [
            "skills.A.cooldown at level 1: 20 --> 17",
            "skills.A.heal.base: 3 --> 4",
            "skills.B.cooldown: still 10 at level 1, changed at higher levels",
            "skills.C.duration at level 1: 2 --> 2.5",
            "skills.D: added (level=3, heal=8, mana=5)",
            "skills.E: added (3 at level 1)",
        ])
        self.assertIsNone(weekly._level_one({"base": True, "max": 2}))

    def test_only_classes_have_levels_and_menus(self) -> None:
        old, new = ("A: {x: 1}\nB:\n  speed: {base: %s, max: 5}\n" % base for base in (6, 7))
        new += "C: {options: {slow: 2}, speed: {base: 6, max: 5}}\n"
        path = "VehicleFramework/a.yml"
        entries = weekly.compare(_snapshot({path: old}), _snapshot({path: new}))["files"][0]["entries"]
        self.assertEqual([entry["details"] for entry in entries], [
            ["speed.base: 6 --> 7"], ["options.slow: 2", "speed.base: 6", "speed.max: 5"],
        ])

    def test_a_new_class_shows_its_stats_and_not_its_menus(self) -> None:
        slots = "\n".join(f"  {n}: {{name: Slot {n}, unlocked-by-default: false}}" for n in range(1, 40))
        new = f"display: {{name: Conjurer}}\nskill-slots:\n{slots}\nexp-table: x\nattributes:\n" \
              "  cooldown-reduction: {base: 10}\n  speed: {base: 4, max: 3}\n"
        facts = weekly.compare(_snapshot({}), _snapshot({"MMOCore/classes/conjurer.yml": new}))
        self.assertEqual(facts["files"][0]["entries"][0]["details"], [
            "display.name: Conjurer", "attributes.cooldown-reduction.base: 10", "attributes.speed at level 1: 3",
        ])

    def test_a_new_revision_alone_is_not_a_change(self) -> None:
        old = "ROBE:\n  base: {name: Robe, armor: 1}\nHAT:\n  base: {name: Hat, armor: 1}\n"
        new = "ROBE:\n  base: {name: Robe, armor: 1, revision-id: 2}\nHAT:\n  base: {name: Hat, armor: 2, revision-id: 2}\n"
        path = "MMOItems/item/robes.yml"
        entries = weekly.compare(_snapshot({path: old}), _snapshot({path: new}))["files"][0]["entries"]
        self.assertEqual([(entry["name"], entry["details"]) for entry in entries], [("Hat", ["base.armor: 1 --> 2"])])
        self.assertEqual(weekly.file_entries(
            {"display": {"name": "Mage"}, "a": {"revision-id": 1}},
            {"display": {"name": "Mage"}, "a": {"revision-id": 2}}, {}), [])

    def test_reformatting_alone_is_not_a_change(self) -> None:
        base = _snapshot({"Cooking/config.yml": "a: 1\nb: 2\n"})
        current = _snapshot({"Cooking/config.yml": "# comment\nb: 2\na: 1\n"})
        self.assertEqual(weekly.compare(base, current)["files"], [])

    def test_entries_are_grouped_by_item_name(self) -> None:
        old = "HORSE:\n  name: Horse\n  max-health: 20\nDONKEY:\n  name: Donkey\n  max-health: 20\n"
        new = old.replace("max-health: 20\nDONKEY", "max-health: 27\nDONKEY")
        facts = weekly.compare(_snapshot({"Cooking/husbandry.yml": old}), _snapshot({"Cooking/husbandry.yml": new}))
        entries = facts["files"][0]["entries"]
        self.assertEqual([entry["name"] for entry in entries], ["Horse"])
        self.assertEqual(entries[0]["details"], ["max-health: 20 --> 27"])

    def test_added_and_removed_entries(self) -> None:
        old = "iron:\n  name: Iron Sword\n  damage: 5\n"
        new = "steel:\n  name: Steel Sword\n  damage: 7\n"
        entries = weekly.compare(_snapshot({"MMOItems/item/sword.yml": old}), _snapshot({"MMOItems/item/sword.yml": new}))[
            "files"
        ][0]["entries"]
        kinds = {entry["name"]: entry["kind"] for entry in entries}
        self.assertEqual(kinds, {"Iron Sword": "removed", "Steel Sword": "added"})

    def test_top_level_settings_are_listed_together(self) -> None:
        old = "corridor-share: 0.5\nrail: 0.8\n"
        new = "corridor-share: 0.5\nrail: 0.4\n"
        entries = weekly.compare(_snapshot({"SimpleFactions/config.yml": old}), _snapshot({"SimpleFactions/config.yml": new}))[
            "files"
        ][0]["entries"]
        self.assertEqual(entries, [{"name": "settings", "kind": "changed", "details": ["rail: 0.8 --> 0.4"]}])

    def test_hidden_files_are_counted_not_listed(self) -> None:
        old = "a:\n  name: A\nb:\n  name: B\n"
        new = "a:\n  name: A2\nb:\n  name: B\nc:\n  name: C\n"
        facts = weekly.compare(_snapshot({"Codex/categories/poi.yml": old}), _snapshot({"Codex/categories/poi.yml": new}))
        self.assertEqual(facts["files"], [])
        self.assertEqual(facts["hidden"], {"Codex": 2})

    def test_plugin_updates_carry_their_repo(self) -> None:
        base = _snapshot({}, {"rpcharacters": ("rpcharacters", "2.11.0"), "mcpets": ("MCPets", "4.1.11")})
        current = _snapshot(
            {},
            {
                "rpcharacters": ("rpcharacters", "2.12.6"),
                "mcpets": ("MCPets", "4.1.11"),
                "activity": ("activity", "1.2.10"),
            },
        )
        updates = weekly.compare(base, current)["plugins"]
        self.assertEqual(
            updates,
            [
                {"plugin": "activity", "repo": "ActivityTF", "old": None, "new": "1.2.10"},
                {"plugin": "rpcharacters", "repo": "RPCharacters", "old": "2.11.0", "new": "2.12.6"},
            ],
        )


class SnapshotFromZipTest(unittest.TestCase):
    def test_reads_configs_and_jars_without_data(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "20261009-060200-abc.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("plugins/simplefactions-3.14.0.jar", b"jar")
                archive.writestr("plugins/MMOCore/classes/juggernaut.yml", _JUGGERNAUT_NEW)
                archive.writestr("plugins/MMOCore/userdata/x.yml", "a: 1")
                archive.writestr("plugins/TFMCCore/tfmc-cooldowns.yml", "a: 1")
                archive.writestr("world/region/r.0.0.mca", b"x")
            snapshot = weekly.snapshot_from_zip(path)
        self.assertEqual(set(snapshot.files), {"MMOCore/classes/juggernaut.yml"})
        self.assertEqual(snapshot.jars, {"simplefactions": ("simplefactions", "3.14.0")})


if __name__ == "__main__":
    unittest.main()
