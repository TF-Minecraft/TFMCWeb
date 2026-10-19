"""In-game warnings store + Discord moderation outbox (bot polls)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from src import database
from src.skins.codes import _parse_iso, api_time
from src.text_validation import (
    TextValidationError,
    assert_optional_display_name,
    assert_prose,
)


class ModerationError(ValueError):
    """Invalid moderation payload."""


_REASON_MAX = 500
_STAFF_NAME_MAX = 32
_MC_NAME_MAX = 16


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _enqueue(
    notice_type: str,
    discord_user_id: str,
    player_uuid: str | None,
    payload: dict[str, Any],
    *,
    conn=None,
) -> int:
    ntype = (notice_type or "").strip()
    discord_id = (discord_user_id or "").strip()
    if not ntype:
        raise ModerationError("notice type is required")
    if not discord_id:
        raise ModerationError("discord_user_id is required for outbox")

    body = database.Jsonb(payload if isinstance(payload, dict) else {})
    uuid = (player_uuid or "").strip() or None

    def _insert(c) -> int:
        return int(c.execute(
            """
            INSERT INTO player_notifications (
                type, discord_user_id, player_uuid, payload, created_at, delivered_at
            ) VALUES (%s, %s, %s, %s, %s, NULL)
            RETURNING id
            """,
            (ntype, discord_id, uuid, body, _utcnow()),
        ).fetchone()["id"])

    if conn is not None:
        return _insert(conn)

    with database.connect() as c:
        return _insert(c)


def record_warning(
    player_uuid: str,
    reason: str,
    *,
    staff_uuid: str | None = None,
    staff_name: str | None = None,
    discord_user_id: str | None = None,
    minecraft_name: str | None = None,
) -> dict:
    """Persist warning; enqueue Discord DM if discord_user_id present."""
    uuid = (player_uuid or "").strip()
    if not uuid:
        raise ModerationError("player_uuid is required")
    try:
        text = assert_prose(reason, min_len=1, max_len=_REASON_MAX, field="reason")
    except TextValidationError as e:
        raise ModerationError(str(e)) from e

    created_at = _iso_now()
    staff_id = (staff_uuid or "").strip() or None
    try:
        staff = assert_optional_display_name(
            staff_name, max_len=_STAFF_NAME_MAX, field="staff name"
        )
        mc_name = assert_optional_display_name(
            minecraft_name, max_len=_MC_NAME_MAX, field="minecraft name"
        )
    except TextValidationError as e:
        raise ModerationError(str(e)) from e
    discord_id = (discord_user_id or "").strip() or None

    with database.connect() as conn:
        warning_id = int(conn.execute(
            """
            INSERT INTO player_warnings (
                player_uuid, staff_uuid, staff_name, reason, created_at
            ) VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (uuid, staff_id, staff, text, _parse_iso(created_at)),
        ).fetchone()["id"])
        mirrored = False
        notice_id = None
        if discord_id:
            notice_id = _enqueue(
                "warn",
                discord_id,
                uuid,
                {
                    "warning_id": warning_id,
                    "minecraft_name": mc_name,
                    "reason": text,
                    "staff_name": staff,
                    "staff_uuid": staff_id,
                },
                conn=conn,
            )
            mirrored = True

    return {
        "ok": True,
        "warning_id": warning_id,
        "mirrored": mirrored,
        "notification_id": notice_id,
        "created_at": created_at,
    }


# Two reports of one ban: Main and Lobby each ban the player, or a server
# reports a ban again. Their end times differ by the seconds between them.
_SAME_BAN_WINDOW = timedelta(minutes=10)
# How long an unban stays in the list the servers sync from.
_UNBAN_SYNC_DAYS = 30


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _from_ms(value: int | None) -> datetime | None:
    return None if value is None else _EPOCH + timedelta(milliseconds=value)


def _to_ms(value: datetime | None) -> int:
    return 0 if value is None else (value - _EPOCH) // timedelta(milliseconds=1)


def _same_ban(row, banned_at: datetime | None, expires_at: datetime | None, now: datetime) -> bool:
    """Whether a ban report repeats the active ban already recorded for the player."""
    if not row["banned"]:
        return False
    if row["expires_at"] is not None and row["expires_at"] <= now:
        return False
    if row["banned_at"] is None or banned_at is None:
        # A server that does not send times: only a report soon after counts.
        return row["updated_at"] >= now - _SAME_BAN_WINDOW
    if row["expires_at"] is None or expires_at is None:
        return row["expires_at"] is None and expires_at is None
    return abs(row["expires_at"] - expires_at) <= _SAME_BAN_WINDOW


def _outlived(row, lapsed_expires_at: datetime | None, now: datetime) -> bool:
    """Whether a lapsed ban one server reports is not the ban recorded, which still holds.

    A server's older tempban runs out while a later ban from another server
    still holds; that expiry must not lift the player's ban.
    """
    if lapsed_expires_at is None or lapsed_expires_at > now or row["banned_at"] is None:
        return False
    if row["expires_at"] is None:
        return True
    return row["expires_at"] > now and abs(row["expires_at"] - lapsed_expires_at) > _SAME_BAN_WINDOW


def _record_ban(
    conn,
    etype: str,
    uuid: str,
    *,
    minecraft_name: str | None,
    reason: str | None,
    staff_name: str | None,
    banned_at: datetime | None,
    expires_at: datetime | None,
) -> bool:
    """Store a ban or unban for the player. False when it repeats what is stored.

    For an unban, banned_at and expires_at describe the ban the server lifted.
    """
    database.advisory_lock(conn, f"moderation:ban:{uuid.lower()}")
    row = conn.execute(
        "SELECT banned, banned_at, expires_at, updated_at FROM player_bans WHERE player_uuid = %s",
        (uuid,),
    ).fetchone()
    now = _utcnow()
    if etype == "ban":
        if row is not None and _same_ban(row, banned_at, expires_at, now):
            if row["banned_at"] is None and banned_at is not None:
                # A server without times reported it first; keep the times so it can sync.
                conn.execute(
                    "UPDATE player_bans SET banned_at = %s, expires_at = %s WHERE player_uuid = %s",
                    (banned_at, expires_at, uuid),
                )
            return False
        conn.execute(
            """
            INSERT INTO player_bans (
                player_uuid, minecraft_name, banned, reason, staff_name,
                banned_at, expires_at, updated_at
            ) VALUES (%s, %s, true, %s, %s, %s, %s, %s)
            ON CONFLICT (player_uuid) DO UPDATE SET
                minecraft_name = COALESCE(EXCLUDED.minecraft_name, player_bans.minecraft_name),
                banned = true,
                reason = EXCLUDED.reason,
                staff_name = EXCLUDED.staff_name,
                banned_at = EXCLUDED.banned_at,
                expires_at = EXCLUDED.expires_at,
                updated_at = EXCLUDED.updated_at
            """,
            (uuid, minecraft_name, reason, staff_name, banned_at, expires_at, now),
        )
        return True
    if row is not None and not row["banned"]:
        return False
    if row is not None and _outlived(row, expires_at, now):
        return False
    conn.execute(
        """
        INSERT INTO player_bans (player_uuid, minecraft_name, banned, updated_at)
        VALUES (%s, %s, false, %s)
        ON CONFLICT (player_uuid) DO UPDATE SET
            minecraft_name = COALESCE(EXCLUDED.minecraft_name, player_bans.minecraft_name),
            banned = false,
            updated_at = EXCLUDED.updated_at
        """,
        (uuid, minecraft_name, now),
    )
    return True


def enqueue_ban_event(
    event: str,
    *,
    player_uuid: str | None = None,
    discord_user_id: str | None = None,
    minecraft_name: str | None = None,
    reason: str | None = None,
    duration: str | None = None,
    staff_name: str | None = None,
    banned_at_ms: int | None = None,
    expires_at_ms: int | None = None,
) -> dict:
    """Record a ban or unban and enqueue its Discord side-effect.

    A report that repeats the player's recorded ban or unban (another server,
    or the same server again) is stored once and sends nothing. banned_at_ms
    and expires_at_ms are epoch milliseconds of the ban made or lifted;
    expires_at_ms 0 is permanent.
    No outbox if unlinked.
    """
    etype = (event or "").strip().lower()
    if etype not in ("ban", "unban"):
        raise ModerationError("event must be 'ban' or 'unban'")

    discord_id = (discord_user_id or "").strip() or None
    uuid = (player_uuid or "").strip() or None
    try:
        mc_name = assert_optional_display_name(
            minecraft_name, max_len=_MC_NAME_MAX, field="minecraft name"
        )
        text = (
            assert_prose(reason, min_len=1, max_len=_REASON_MAX, field="reason")
            if (reason or "").strip()
            else None
        )
        staff = assert_optional_display_name(
            staff_name, max_len=_STAFF_NAME_MAX, field="staff name"
        )
    except TextValidationError as e:
        raise ModerationError(str(e)) from e
    payload = {
        "minecraft_name": mc_name,
        "reason": text,
        "duration": (duration or "").strip() or None,
        "staff_name": staff,
    }
    try:
        banned_at = _from_ms(banned_at_ms) if banned_at_ms else None
        expires_at = _from_ms(expires_at_ms) if banned_at and expires_at_ms else None
    except (OverflowError, ValueError) as e:
        raise ModerationError("ban times are out of range") from e

    with database.connect() as conn:
        if uuid and not _record_ban(
            conn,
            etype,
            uuid,
            minecraft_name=mc_name,
            reason=text,
            staff_name=staff,
            banned_at=banned_at,
            expires_at=expires_at,
        ):
            return {"ok": True, "mirrored": False, "duplicate": True, "notification_id": None}
        if not discord_id:
            return {"ok": True, "mirrored": False, "notification_id": None}
        notice_id = _enqueue(etype, discord_id, uuid, payload, conn=conn)
    return {"ok": True, "mirrored": True, "notification_id": notice_id}


def list_ban_sync() -> dict:
    """Active bans with known times, and recent unbans, for servers to apply."""
    now = _utcnow()
    with database.connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM player_bans
            WHERE (banned AND banned_at IS NOT NULL AND (expires_at IS NULL OR expires_at > %s))
               OR (NOT banned AND updated_at > %s)
            ORDER BY player_uuid
            """,
            (now, now - timedelta(days=_UNBAN_SYNC_DAYS)),
        ).fetchall()
    return {
        "bans": [
            {
                "player_uuid": row["player_uuid"],
                "minecraft_name": row["minecraft_name"],
                "reason": row["reason"],
                "staff_name": row["staff_name"],
                "banned_at_ms": _to_ms(row["banned_at"]),
                "expires_at_ms": _to_ms(row["expires_at"]),
            }
            for row in rows
            if row["banned"]
        ],
        "unbans": [
            {"player_uuid": row["player_uuid"], "unbanned_at_ms": _to_ms(row["updated_at"])}
            for row in rows
            if not row["banned"]
        ],
    }


_ADDRESSEE_MAX = 256
_CONTENTS_MAX = 500


def enqueue_bird_mail(
    *,
    player_uuid: str | None = None,
    discord_user_id: str | None = None,
    addressee_character: str,
    sender_minecraft_name: str | None = None,
    contents_preview: str | None = None,
) -> dict:
    """Enqueue bird mail Discord DM. No outbox if unlinked."""
    discord_id = (discord_user_id or "").strip() or None
    if not discord_id:
        return {"ok": True, "mirrored": False, "notification_id": None}

    uuid = (player_uuid or "").strip() or None
    character = (addressee_character or "").strip()
    if not character:
        raise ModerationError("addressee_character is required")
    if len(character) > _ADDRESSEE_MAX:
        raise ModerationError(
            f"addressee_character cannot exceed {_ADDRESSEE_MAX} characters"
        )

    try:
        sender = assert_optional_display_name(
            sender_minecraft_name, max_len=_MC_NAME_MAX, field="sender minecraft name"
        )
        contents = (
            assert_prose(
                contents_preview,
                min_len=1,
                max_len=_CONTENTS_MAX,
                field="contents preview",
            )
            if (contents_preview or "").strip()
            else None
        )
    except TextValidationError as e:
        raise ModerationError(str(e)) from e

    payload = {
        "addressee_character": character,
        "sender_minecraft_name": sender,
        "contents_preview": contents,
    }
    notice_id = _enqueue("bird_mail", discord_id, uuid, payload)
    return {"ok": True, "mirrored": True, "notification_id": notice_id}


def list_undelivered_moderation() -> list[dict]:
    with database.connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM player_notifications
            WHERE delivered_at IS NULL
            ORDER BY created_at ASC, id ASC
            """
        ).fetchall()

    return [
        {
            "id": row["id"],
            "type": row["type"],
            "discord_user_id": row["discord_user_id"],
            "player_uuid": row["player_uuid"],
            "payload": row["payload"],
            "created_at": api_time(row["created_at"]),
        }
        for row in rows
    ]


def ack_moderation(ids: list[int]) -> dict:
    raw_ids = [int(i) for i in (ids or []) if i is not None]
    if not raw_ids:
        return {"acked": [], "delivered_at": None}

    now = _utcnow()
    with database.connect() as conn:
        conn.execute("SELECT id FROM player_notifications WHERE id = ANY(%s) ORDER BY id FOR UPDATE",
                     (raw_ids,)).fetchall()
        # Already delivered notices are acked again without moving their time.
        conn.execute(
            "UPDATE player_notifications SET delivered_at = %s WHERE id = ANY(%s) AND delivered_at IS NULL",
            (now, raw_ids),
        )
        known = {
            row["id"]
            for row in conn.execute("SELECT id FROM player_notifications WHERE id = ANY(%s)", (raw_ids,))
        }
    acked = [notice_id for notice_id in raw_ids if notice_id in known]

    return {"acked": acked, "delivered_at": api_time(now) if acked else None}


def _self_test() -> None:
    """Runs against DATABASE_URL: python -m src.skins.moderation"""
    uuid = "00000000-0000-4000-8000-000000000107"
    discord_id = "999888777666555444"

    with database.connect() as conn:
        conn.execute("DELETE FROM player_warnings WHERE player_uuid = %s", (uuid,))
        conn.execute(
            "DELETE FROM player_notifications WHERE player_uuid = %s", (uuid,)
        )

    unlinked = record_warning(uuid, "test unlinked", staff_name="Tester")
    assert unlinked["ok"] and not unlinked["mirrored"]

    linked = record_warning(
        uuid,
        "test linked",
        staff_name="Tester",
        discord_user_id=discord_id,
        minecraft_name="WarnTest",
    )
    assert linked["mirrored"] and linked["notification_id"]

    skipped = enqueue_ban_event("ban", player_uuid=uuid, reason="x")
    assert not skipped["mirrored"]

    banned = enqueue_ban_event(
        "ban",
        player_uuid=uuid,
        discord_user_id=discord_id,
        minecraft_name="WarnTest",
        reason="grief",
        duration="8h",
        staff_name="Mod",
    )
    assert banned["mirrored"]

    bird = enqueue_bird_mail(
        player_uuid=uuid,
        discord_user_id=discord_id,
        addressee_character="Test Character",
        sender_minecraft_name="Sender",
        contents_preview="Hello from the bird.",
    )
    assert bird["mirrored"]

    notices = list_undelivered_moderation()
    ours = [n for n in notices if n.get("player_uuid") == uuid]
    assert len(ours) >= 3
    ack = ack_moderation([n["id"] for n in ours])
    assert len(ack["acked"]) >= 3
    left = [n for n in list_undelivered_moderation() if n.get("player_uuid") == uuid]
    assert not left
    print("moderation self-test OK")


if __name__ == "__main__":
    _self_test()
