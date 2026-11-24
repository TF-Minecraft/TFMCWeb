"""Tests for the player note command."""

from __future__ import annotations

import contextlib
import io
import sys
import unittest
from pathlib import Path
from unittest import mock

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes import player_note  # noqa: E402


class PlayerNoteTest(unittest.TestCase):
    def setUp(self) -> None:
        patcher = mock.patch.object(player_note, "db")
        self.db = patcher.start()
        self.addCleanup(patcher.stop)

    def _main(self, *argv: str) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = player_note.main(list(argv))
        return code, out.getvalue()

    def test_add_takes_several_lines(self) -> None:
        self.db.add_player_note.side_effect = lambda body, **_: {"week": "2026-W48", "id": 1, "body": body}
        code, out = self._main("add", "--author", "claude", "One.", "Two.")
        self.assertEqual((code, out), (0, "2026-W48 #1: One.\n2026-W48 #1: Two.\n"))
        self.db.add_player_note.assert_called_with("Two.", author="claude", week=None)

    def test_list_defaults_to_the_open_week(self) -> None:
        self.db.current_week.return_value = "2026-W48"
        self.db.list_player_notes.return_value = [{"week": "2026-W48", "id": 1, "author": "", "body": "One."}]
        self.assertEqual(self._main("list"), (0, "2026-W48 #1 (unknown): One.\n"))
        self.db.list_player_notes.assert_called_once_with("2026-W48")

    def test_remove(self) -> None:
        self.db.remove_player_note.side_effect = [True, False]
        self.assertEqual(self._main("remove", "3"), (0, "Removed #3.\n"))
        self.assertEqual(self._main("remove", "3"), (1, "No note #3.\n"))


if __name__ == "__main__":
    unittest.main()
