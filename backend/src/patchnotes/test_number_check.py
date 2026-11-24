"""Tests for the numbers of a post against the week's changes."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes.number_check import pairs, unconfirmed  # noqa: E402

_PROMPT = """Write it as `Old --> New`, such as `21 --> 18`.

["# Update 5.8\\n- Bash 9 --> 7 s"]

Staff notes for this week, oldest first.

- Horses 13 --> 16 blocks

Facts:

- skills.Challenge.cooldown at level 1: 20 --> 17; alloy: 0.4 --> 0.6; delay: 40 --> 60; price: 1,000 --> 1,500
"""


class NumberCheckTest(unittest.TestCase):
    def test_changes_in_the_facts_are_known_in_other_units_too(self) -> None:
        post = ["- **Challenge:** cooldown 20 --> 17 s", "- Alloys 40% --> 60%\n- Delay 2 s --> 3 s, 1000 --> **1500** denars, horses 13 --> 16"]
        self.assertEqual(unconfirmed(post, _PROMPT), [])

    def test_other_changes_are_listed_with_their_line(self) -> None:
        post = ["# Update\n- Challenge 21 --> 18 s\n- Bash 9 --> 7 s, Challenge 20 --> 17 s\n- Two new classes"]
        self.assertEqual(unconfirmed(post, _PROMPT), [
            ("- Challenge 21 --> 18 s", "21 --> 18"), ("- Bash 9 --> 7 s, Challenge 20 --> 17 s", "9 --> 7"),
        ])

    def test_pairs_need_a_number_on_both_sides(self) -> None:
        self.assertEqual(pairs("none --> 5; 3 --> removed; 0.15 --> 0.2 per second"), {(0.15, 0.2)})


if __name__ == "__main__":
    unittest.main()
