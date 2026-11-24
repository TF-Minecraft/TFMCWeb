"""Tests for the host runner that sends a closed week's comparison."""

from __future__ import annotations

import argparse
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes import weekly_run  # noqa: E402

_BERLIN = ZoneInfo("Europe/Berlin")


def _args(directory: str, **overrides) -> argparse.Namespace:
    values = {
        "backups_dir": directory,
        "api_base": "http://127.0.0.1:8000",
        "staff_key": "key",
        "week": "",
        "force": False,
        "dry_run": False,
    }
    values.update(overrides)
    return argparse.Namespace(**values)


def _backup(directory: Path, stamp: str, health: int, jar: str) -> None:
    with zipfile.ZipFile(directory / f"{stamp}-0a1b2c.zip", "w") as archive:
        archive.writestr(f"plugins/{jar}", b"jar")
        archive.writestr(
            "plugins/MMOCore/classes/juggernaut.yml",
            f"display:\n  name: Juggernaut\nattributes:\n  max_health:\n    base: {health}\n",
        )


class WeekMathTest(unittest.TestCase):
    def test_cutoff_is_friday_noon_berlin(self) -> None:
        self.assertEqual(
            weekly_run.week_cutoff("2026-W41", _BERLIN), datetime(2026, 10, 9, 10, 0, tzinfo=timezone.utc)
        )
        # Winter time: noon in Berlin is 11:00 UTC.
        self.assertEqual(
            weekly_run.week_cutoff("2026-W50", _BERLIN), datetime(2026, 12, 11, 11, 0, tzinfo=timezone.utc)
        )

    def test_closed_week_turns_over_at_the_cutoff(self) -> None:
        before = datetime(2026, 10, 9, 9, 59, tzinfo=timezone.utc)
        after = datetime(2026, 10, 9, 10, 0, tzinfo=timezone.utc)
        sunday = datetime(2026, 10, 11, 20, 0, tzinfo=timezone.utc)
        self.assertEqual(weekly_run.closed_week(before, _BERLIN), "2026-W40")
        self.assertEqual(weekly_run.closed_week(after, _BERLIN), "2026-W41")
        self.assertEqual(weekly_run.closed_week(sunday, _BERLIN), "2026-W41")


class BackupsTest(unittest.TestCase):
    def test_lists_amp_backups_by_their_utc_stamp(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("20261009-060200-aa.zip", "20261002-060200-bb.zip", "notes.zip", "old.jar"):
                (root / name).write_bytes(b"")
            found = weekly_run.backups(root)
        self.assertEqual([path.name for _, path in found], ["20261002-060200-bb.zip", "20261009-060200-aa.zip"])
        self.assertEqual(found[0][0], datetime(2026, 10, 2, 6, 2, tzinfo=timezone.utc))
        cutoff = datetime(2026, 10, 9, 6, 1, tzinfo=timezone.utc)
        self.assertEqual(weekly_run.latest_before(found, cutoff)[1].name, "20261002-060200-bb.zip")


class CommitSubjectsTest(unittest.TestCase):
    def test_falls_back_to_tags_without_v_and_keeps_safe_subjects(self) -> None:
        calls = []

        def fetch(path: str):
            calls.append(path)
            if "/v2.11.0...v2.12.6" in path:
                raise ValueError("no such tag")
            return {
                "commits": [
                    {"commit": {"message": "Make armour take time to put on (#72)\n\nBody"}},
                    {"commit": {"message": "Merge pull request #9 from x/y"}},
                    {"commit": {"message": "Rotate staff_key: hunter2"}},
                    {"commit": {"message": "Add a hidden path"}},
                    {"commit": {"message": "Mage paths (Dev)"}},
                ]
            }

        subjects = weekly_run.commit_subjects("RPCharacters", "2.11.0", "2.12.6", fetch)
        self.assertEqual(subjects, ["Make armour take time to put on"])
        self.assertTrue(calls[0].endswith("/repos/TF-Minecraft/RPCharacters/compare/v2.11.0...v2.12.6"))
        self.assertTrue(calls[1].endswith("/compare/2.11.0...2.12.6"))


    @mock.patch.dict("os.environ", {"PATCHNOTES_HIDDEN_WORDS": "moonpath"})
    def test_details_keep_what_changed_and_drop_reviews_and_hidden_work(self) -> None:
        message = (
            "Upkeep-only vehicles (#247)\n\n* Pay vehicle upkeep from the bank\n\n"
            "The leader moves vehicles in, up to three\nper member.\n\n"
            "The hidden dungeon gets a new vehicle.\n\nMoonpath users pay less.\n\nThe chest is at 1200, 64, -900.\n\n"
            "Another is at 12, 64, -34.\n\n"
            "Co-Authored-By: A <a@example.net>\n\n* Address review round 1\n\nGuild rows use the incarnation.\n"
        )
        self.assertEqual(
            weekly_run.commit_detail(message),
            "Pay vehicle upkeep from the bank The leader moves vehicles in, up to three per member.",
        )
        self.assertEqual(weekly_run.commit_detail("Add the hidden path\n\nBody"), "")
        self.assertEqual(weekly_run.commit_detail("Only a subject"), "")
        long = weekly_run.commit_detail("Subject\n\n" + "word " * 2000)
        self.assertLess(len(long), 1830)
        self.assertTrue(long.endswith("(shortened)"))

    @mock.patch.dict("os.environ", {}, clear=True)
    def test_no_details_without_the_hidden_words(self) -> None:
        self.assertEqual(weekly_run.commit_detail("Subject\n\nBody"), "")

    @mock.patch.dict("os.environ", {"PATCHNOTES_HIDDEN_WORDS": "moonpath"})
    def test_details_belong_to_kept_subjects(self) -> None:
        details: dict[str, str] = {}
        weekly_run.commit_subjects(
            "RPCharacters", "1", "2",
            lambda _path: {"commits": [{"commit": {"message": "Make armour take time to put on (#72)\n\nFive seconds."}}]},
            details,
        )
        self.assertEqual(details, {"Make armour take time to put on": "Five seconds."})


class RunTest(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        root = Path(self.directory.name)
        _backup(root, "20261002-060200", 30, "rpcharacters-2.11.0.jar")
        _backup(root, "20261009-060200", 28, "rpcharacters-2.12.6.jar")
        self.now = datetime(2026, 10, 9, 10, 30, tzinfo=timezone.utc)
        patcher = mock.patch.object(weekly_run, "_github", return_value={"commits": []})
        self.addCleanup(patcher.stop)
        patcher.start()

    def test_sends_the_week_once(self) -> None:
        sent = []

        def api(base, key, method, path, payload=None):
            if method == "GET":
                return 404, None
            sent.append((path, payload))
            return 200, {}

        with mock.patch.object(weekly_run, "_api", side_effect=api):
            result = weekly_run.run(_args(self.directory.name), now=self.now)
        self.assertEqual(result, "2026-W41: sent 1 changed files and 1 plugin updates")
        path, payload = sent[0]
        self.assertEqual(path, "/patchnotes/staff/weeks/2026-W41/facts")
        facts = payload["facts"]
        self.assertEqual(facts["since"], "2026-10-02T06:02:00+00:00")
        self.assertEqual(facts["until"], "2026-10-09T06:02:00+00:00")
        self.assertFalse(facts["partial"])
        self.assertEqual(facts["plugins"][0]["old"], "2.11.0")

    def test_keeps_the_configs_of_the_closing_backup_first(self) -> None:
        kept = Path(self.directory.name, "kept")
        kept.mkdir()
        env = {"PATCHNOTES_CONFIGS_DIR": str(kept), "PATCHNOTES_HIDDEN_WORDS": "moonpath"}

        def api(_base, _key, method, _path, payload=None):
            if method == "POST":
                self.assertEqual([path.name for path in kept.iterdir()], ["2026-W41"])
            return (404 if method == "GET" else 200), {}

        with mock.patch.dict("os.environ", env), mock.patch.object(weekly_run, "_api", side_effect=api) as called:
            weekly_run.run(_args(self.directory.name), now=self.now)
            self.assertEqual(called.call_count, 2)
        env["PATCHNOTES_CONFIGS_DIR"] = str(kept / "gone")
        with mock.patch.dict("os.environ", env), mock.patch.object(weekly_run, "_api", side_effect=api):
            self.assertIn("sent", weekly_run.run(_args(self.directory.name), now=self.now))

    def test_skips_a_week_the_api_already_has(self) -> None:
        with mock.patch.object(weekly_run, "_api", return_value=(200, {})) as api:
            result = weekly_run.run(_args(self.directory.name), now=self.now)
        self.assertEqual(result, "2026-W41: facts already sent")
        self.assertEqual(api.call_count, 1)

    def test_waits_for_the_cutoff_and_gives_up_after_three_days(self) -> None:
        late = datetime(2026, 10, 12, 11, 0, tzinfo=timezone.utc)
        with mock.patch.object(weekly_run, "_api") as api:
            result = weekly_run.run(_args(self.directory.name), now=late)
        self.assertEqual(result, "2026-W41: closed too long ago")
        api.assert_not_called()

    def test_uses_the_oldest_backup_when_last_week_is_gone(self) -> None:
        Path(self.directory.name, "20261002-060200-0a1b2c.zip").rename(
            Path(self.directory.name, "20261005-060200-0a1b2c.zip")
        )
        sent = []
        with mock.patch.object(
            weekly_run, "_api", side_effect=lambda *a, **k: (404, None) if a[2] == "GET" else sent.append(a[4]) or (200, {})
        ):
            weekly_run.run(_args(self.directory.name), now=self.now)
        self.assertTrue(sent[0]["facts"]["partial"])


class MainTest(unittest.TestCase):
    def test_a_rejected_request_fails_the_run(self) -> None:
        argv = ["--backups-dir", "/backups", "--staff-key", "key"]
        with mock.patch.object(weekly_run, "run", return_value="2026-W41: API returned HTTP 502"):
            self.assertEqual(weekly_run.main(argv), 1)
        with mock.patch.object(weekly_run, "run", return_value="2026-W41: facts already sent"):
            self.assertEqual(weekly_run.main(argv), 0)


if __name__ == "__main__":
    unittest.main()
