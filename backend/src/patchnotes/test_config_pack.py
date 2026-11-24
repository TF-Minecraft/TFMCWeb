"""Tests for the configs the post writer may read."""

from __future__ import annotations

import os
import re
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes import config_pack  # noqa: E402


_WORDS = re.compile("moonpath", re.IGNORECASE)


class ConfigPackTest(unittest.TestCase):
    def setUp(self) -> None:
        patcher = mock.patch.dict(os.environ, {"PATCHNOTES_HIDDEN_WORDS": "moonpath, Sun Seal"})
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_only_gameplay_files_are_allowed(self) -> None:
        for relative in ("MMOCore/classes/mage.yml", "MythicMobs/skills/TFMC/Classes/a.yml", "Cooking/config.yml"):
            self.assertTrue(config_pack.allowed(relative, _WORDS), relative)
        for relative in (
            "MMOCore/classes/moonpath.yml", "MythicMobs/mobs/boss.yml", "Codex/categories/poi.yml",
            "MMOItems/item/research.yml", "LuckPerms/config.yml", "RPCharacters/config.yml",
            "Magic/elements/fire.yml", "activity/referrals.yml", "MMOItems/item/staff_tools.yml",
        ):
            self.assertFalse(config_pack.allowed(relative, _WORDS), relative)

    def test_logins_and_links_are_removed(self) -> None:
        text = "cooldown: 5\n  password: hunter2\nmysql-host: 1.2.3.4\nsite: https://example.net/a?b\nclass: Moonpath\n"
        self.assertEqual(config_pack.cleaned(text, _WORDS), "cooldown: 5\nsite: (removed)\n")

    def test_the_pack_is_the_backup_the_facts_end_with(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for stamp, value in (("20261008-060200", 1), ("20261009-060200", 2), ("20261010-060200", 3)):
                with zipfile.ZipFile(root / f"{stamp}-ab12.zip", "w") as archive:
                    archive.writestr("Minecraft/plugins/MMOCore/classes/mage.yml", f"health: {value}\n")
                    archive.writestr(
                        "Minecraft/plugins/SimpleFactions/owners.yml", "a: 069a79f4-44e9-4726-a5be-fca90e38aaf5"
                    )
                    archive.writestr("Minecraft/plugins/LuckPerms/config.yml", "password: x\n")
                    archive.writestr("Minecraft/plugins/MMOCore/../../evil.yml", "x: 1\n")
            target = root / "pack"
            self.assertEqual(config_pack.write_pack("2026-W41", root, target), 1)
            self.assertEqual((target / "MMOCore/classes/mage.yml").read_text(), "health: 2\n")
            self.assertFalse((root / "evil.yml").exists())
            self.assertEqual(config_pack.write_pack("2026-W30", root, root / "none"), 0)
            with mock.patch.dict(os.environ, {"PATCHNOTES_HIDDEN_WORDS": " , "}):
                self.assertEqual(config_pack.write_pack("2026-W41", root, root / "unset"), 0)

    def test_an_open_week_has_no_final_backup(self) -> None:
        now = datetime(2026, 10, 9, 9, 0, tzinfo=timezone.utc)
        self.assertFalse(config_pack.is_current("2026-W41", now))
        self.assertTrue(config_pack.is_current("2026-W40", now))


if __name__ == "__main__":
    unittest.main()
