"""Pure lore helpers: the feature flag, day ranges, effective availability and mention parsing."""
from __future__ import annotations

from datetime import date

import pytest

from . import flag
from .availability import day_range, effective
from .errors import LoreError
from .mentions import parse


@pytest.mark.parametrize(
    ("panel", "production", "expected"),
    [
        (None, None, True),
        (None, "1", False),
        ("on", "1", True),
        ("TRUE", "1", True),
        ("off", None, False),
        ("0", None, False),
        ("maybe", None, True),
        ("maybe", "1", False),
    ],
)
def test_flag(monkeypatch, panel, production, expected):
    for name, value in (("LORE_PANEL", panel), ("PS_PRODUCTION", production)):
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)
    assert flag.enabled() is expected


def test_day_range():
    assert day_range("2026-11-01", "2026-11-01") == (date(2026, 11, 1), date(2026, 11, 1))
    assert day_range("2026-11-01", "2027-01-01") == (date(2026, 11, 1), date(2027, 1, 1))  # 62 days
    for start, end, code in (
        ("2026-11-01", "2027-01-02", "range_too_long"),
        ("2026-11-02", "2026-11-01", "bad_range"),
        ("soon", "2026-11-01", "bad_range"),
        (None, "2026-11-01", "bad_range"),
    ):
        with pytest.raises(LoreError) as caught:
            day_range(start, end)
        assert caught.value.code == code


def test_effective_prefers_override_then_weekly():
    monday, tuesday, wednesday = date(2026, 11, 16), date(2026, 11, 17), date(2026, 11, 18)
    weekly = {0: {"status": "full", "note": ""}, 1: {"status": "none", "note": "work"}}
    overrides = {monday: {"status": "partial", "note": "evening"}}
    assert effective(weekly, overrides, monday) == {"status": "partial", "note": "evening", "source": "override"}
    assert effective(weekly, overrides, tuesday) == {"status": "none", "note": "work", "source": "weekly"}
    assert effective(weekly, overrides, wednesday) == {"status": None, "note": "", "source": None}


def test_parse_mentions():
    text = "Met [[character:3|Aldric]] at [[location:7]] and again [[character:3|him]]; [[dragon:1|x]] [[event:x]]"
    assert parse([text, None, "[[storyline:2|The Fall]]"]) == [("character", 3), ("location", 7), ("storyline", 2)]
