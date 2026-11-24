"""Tests for the configs the post writer may read."""

from __future__ import annotations

import os
import re
import sys
import tempfile
import unittest
import zipfile
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

    def test_links_and_hidden_words_are_removed(self) -> None:
        text = "cooldown: 5 # seconds\nsite: https://example.net/a?b\nclass: Moonpath\npassives: 2\n# password: x\n"
        self.assertEqual(
            config_pack.cleaned(text, _WORDS), "cooldown: 5 # seconds\nsite: (removed)\npassives: 2\n"
        )

    def test_whole_login_values_are_removed(self) -> None:
        for secret in (
            '"password": hunter2', "password: |\n  hunter2\n  hunter2", "db: {dbPassword: hunter2, cooldown: 5}",
            "list:\n- token: hunter2", "api-key:\n- hunter2", "mysql:\n  a: hunter2", "authToken: >-\n  hunter2",
        ):
            text = config_pack.cleaned(f"cooldown: 5\npassives: 2\n{secret}\n", _WORDS)
            self.assertNotIn("hunter2", text, secret)
            self.assertIn("cooldown: 5\npassives: 2\n", text, secret)
        self.assertIsNone(config_pack.cleaned("a: [password: x", _WORDS))

    def test_the_pack_holds_only_this_backups_gameplay_configs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            backup = root / "20261009-060200-ab12.zip"
            with zipfile.ZipFile(backup, "w") as archive:
                archive.writestr("Minecraft/plugins/MMOCore/classes/mage.yml", "health: 2\n")
                archive.writestr("Minecraft/plugins/MMOCore/classes/broken.yml", "a: [\n")
                archive.writestr(
                    "Minecraft/plugins/SimpleFactions/owners.yml", "a: 069a79f4-44e9-4726-a5be-fca90e38aaf5"
                )
                archive.writestr("Minecraft/plugins/LuckPerms/config.yml", "password: x\n")
                archive.writestr("Minecraft/plugins/MMOCore/../../evil.yml", "x: 1\n")
            kept = root / "kept"
            (kept / "2026-W40").mkdir(parents=True)
            self.assertEqual(config_pack.keep_pack(backup, "2026-W41", kept), 1)
            self.assertEqual((kept / "2026-W41/MMOCore/classes/mage.yml").read_text(), "health: 2\n")
            self.assertEqual([path.name for path in kept.iterdir()], ["2026-W41"])
            self.assertFalse((root / "evil.yml").exists())
            with mock.patch.dict(os.environ, {"PATCHNOTES_HIDDEN_WORDS": " , "}):
                self.assertEqual(config_pack.keep_pack(backup, "2026-W41", kept), 0)
            self.assertEqual(list(kept.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
