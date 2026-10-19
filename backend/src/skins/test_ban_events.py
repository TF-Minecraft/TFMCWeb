"""Ban reports from several servers: one Discord message per ban, and the list servers sync from."""

from __future__ import annotations

import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from src import database
from src.skins.moderation import (
    enqueue_ban_event,
    list_ban_sync,
    list_undelivered_moderation,
)

pytestmark = pytest.mark.usefixtures("postgres")

UUID = "00000000-0000-4000-8000-000000000201"
DISCORD = "704087973238669453"
HOUR = 3_600_000
DAY = 24 * HOUR


def _ban(banned_at: int | None, expires_at: int | None, **extra) -> dict:
    return enqueue_ban_event(
        "ban",
        player_uuid=UUID,
        discord_user_id=DISCORD,
        minecraft_name="P0T4T02545",
        reason="Instant kill traps (4.3)",
        duration="1 day",
        staff_name="MrEnzo99",
        banned_at_ms=banned_at,
        expires_at_ms=expires_at,
        **extra,
    )


def _unban(staff: str | None = None, banned_at: int | None = None, expires_at: int | None = None) -> dict:
    return enqueue_ban_event(
        "unban",
        player_uuid=UUID,
        discord_user_id=DISCORD,
        minecraft_name="P0T4T02545",
        staff_name=staff,
        banned_at_ms=banned_at,
        expires_at_ms=expires_at,
    )


def _notices() -> list[str]:
    return [n["type"] for n in list_undelivered_moderation() if n["player_uuid"] == UUID]


def _now_ms() -> int:
    return int(time.time() * 1000)


def test_main_and_lobby_bans_send_one_message():
    now = _now_ms()
    assert _ban(now, now + DAY)["mirrored"]
    # Lobby: the same /tempban 9 seconds later.
    lobby = _ban(now + 9_000, now + DAY + 9_000)
    assert lobby == {"ok": True, "mirrored": False, "duplicate": True, "notification_id": None}
    # A server reporting it again after a restart, with the times rounded to seconds.
    assert _ban(now // 1000 * 1000, (now + DAY) // 1000 * 1000)["duplicate"]
    assert _notices() == ["ban"]

    assert _unban()["mirrored"]
    assert _unban("Ban expired")["duplicate"]
    assert _notices() == ["ban", "unban"]


def test_a_new_ban_length_or_a_ban_after_an_unban_is_sent():
    now = _now_ms()
    _ban(now, now + DAY)
    assert _ban(now + HOUR, now + 7 * DAY)["mirrored"]
    assert _ban(now + 2 * HOUR, 0)["mirrored"]
    assert _ban(now + 3 * HOUR, 0)["duplicate"]
    _unban()
    assert _ban(now + 4 * HOUR, 0)["mirrored"]
    assert _notices() == ["ban", "ban", "ban", "unban", "ban"]


def test_an_expired_ban_does_not_hide_a_new_one():
    now = _now_ms()
    _ban(now - 2 * DAY, now - DAY)
    # The same end time as the lapsed ban, but that ban is over.
    assert _ban(now - 2 * DAY + 60_000, now - DAY + 60_000)["mirrored"]


def test_servers_without_times_dedupe_reports_close_together():
    assert _ban(None, None)["mirrored"]
    assert _ban(None, None)["duplicate"]
    with database.connect() as conn:
        conn.execute(
            "UPDATE player_bans SET updated_at = %s WHERE player_uuid = %s",
            (datetime.now(timezone.utc) - timedelta(hours=1), UUID),
        )
    assert _ban(None, None)["mirrored"]
    # A ban without times is not handed to other servers.
    assert list_ban_sync()["bans"] == []


def test_unlinked_players_are_recorded_for_sync_without_messages():
    now = _now_ms()
    result = enqueue_ban_event(
        "ban", player_uuid=UUID, minecraft_name="Ada", banned_at_ms=now, expires_at_ms=0, staff_name="Mod"
    )
    assert result == {"ok": True, "mirrored": False, "notification_id": None}
    assert enqueue_ban_event("ban", player_uuid=UUID, banned_at_ms=now, expires_at_ms=0)["duplicate"]
    assert _notices() == []
    assert list_ban_sync()["bans"] == [
        {
            "player_uuid": UUID,
            "minecraft_name": "Ada",
            "reason": None,
            "staff_name": "Mod",
            "banned_at_ms": now,
            "expires_at_ms": 0,
        }
    ]


def test_an_unban_for_a_ban_from_before_the_record_is_sent():
    assert _unban()["mirrored"]
    assert _unban()["duplicate"]


def test_sync_lists_active_bans_and_recent_unbans():
    now = _now_ms()
    _ban(now, now + DAY)
    other = "00000000-0000-4000-8000-000000000202"
    enqueue_ban_event("ban", player_uuid=other, banned_at_ms=now - 2 * DAY, expires_at_ms=now - DAY)
    sync = list_ban_sync()
    assert [b["player_uuid"] for b in sync["bans"]] == [UUID]
    assert sync["bans"][0]["expires_at_ms"] == now + DAY
    assert sync["unbans"] == []

    _unban()
    sync = list_ban_sync()
    assert sync["bans"] == []
    assert [u["player_uuid"] for u in sync["unbans"]] == [UUID]
    assert sync["unbans"][0]["unbanned_at_ms"] >= now


def test_an_older_ban_running_out_does_not_lift_a_later_one():
    now = _now_ms()
    _ban(now - DAY, now - 60_000)
    assert _ban(now - HOUR, 0)["mirrored"]  # made permanent on another server
    assert _unban("Ban expired", now - DAY, now - 60_000)["duplicate"]
    assert list_ban_sync()["bans"][0]["expires_at_ms"] == 0
    # The same ban running out on each server lifts it once.
    assert _ban(now - HOUR, now - 30_000)["mirrored"]
    assert _unban("Ban expired", now - HOUR, now - 30_000)["mirrored"]
    assert _unban("Ban expired", now - HOUR + 9_000, now - 21_000)["duplicate"]
    # A staff /unban lifts whatever ban is recorded.
    _ban(now, 0)
    assert _unban("Mod", now - DAY, now + DAY)["mirrored"]
