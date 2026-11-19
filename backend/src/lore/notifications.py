"""Discord DMs about lore events, queued for the bot in `lore_notifications`.

Rows are written in the same transaction as the event change:
- `event_scheduled` when an event becomes scheduled (or is restored while scheduled);
- `event_rescheduled` when a scheduled event's day or start time changes;
- `event_cancelled` when a scheduled event is deleted or leaves `scheduled` for anything
  but `done`, sent to whoever was told about it since the last cancellation.

Who is told about a day: roster members with notifications on, where the setting is
`all`, or `available` (the default) and they are Full or Partial that day. Assigned
helpers are told unless they turned notifications off.

The bot polls `pending` with the staff key and acks what it delivered, exactly like
war notifications; handed-out rows come back after ten minutes until acked.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta
from typing import Any

from fastapi.encoders import jsonable_encoder

from src import database

from .people import ROSTER_SQL, STAFF_ROLES

SITE_DEFAULT = "https://www.tfminecraft.net"
REDELIVER_AFTER = timedelta(minutes=10)
DEFAULT_LIMIT = 50
MAX_LIMIT = 200
SENT_KINDS = ("event_scheduled", "event_rescheduled")


def site_url() -> str:
    for name in ("PUBLIC_SITE_URL", "SITE_PUBLIC_URL"):
        value = (os.environ.get(name) or "").strip().rstrip("/")
        if value:
            return value
    return SITE_DEFAULT


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


# The effective availability of roster member r on %(day)s: that day's override, else
# the weekly default for its weekday (0 = Monday), else NULL (not set).
EFFECTIVE_SQL = """
coalesce(
    (SELECT a.status FROM lore_availability a WHERE a.user_id = r.user_id AND a.day = %(day)s),
    (SELECT w.status FROM lore_weekly_availability w
      WHERE w.user_id = r.user_id AND w.weekday = extract(isodow FROM %(day)s::date)::int - 1)
)
"""


def _audience(conn: database.Connection, event_id: int, day: date) -> list[dict]:
    """Roster members to tell about event `event_id` on `day`, with their status that day."""
    rows = conn.execute(
        f"SELECT r.discord_user_id::text AS discord_user_id, r.notify_mode, {EFFECTIVE_SQL} AS day_status, "
        "EXISTS (SELECT 1 FROM lore_event_helpers h WHERE h.event_id = %(event_id)s AND h.user_id = r.user_id) "
        "AS is_helper "
        f"FROM ({ROSTER_SQL}) r WHERE r.notify_mode <> 'off'",
        {"staff_roles": STAFF_ROLES, "day": day, "event_id": event_id},
    ).fetchall()
    return [
        dict(row)
        for row in rows
        if row["discord_user_id"]
        and (row["notify_mode"] == "all" or row["is_helper"] or row["day_status"] in ("full", "partial"))
    ]


def _people(conn: database.Connection, event_id: int, day: date, discord_ids: set[str]) -> list[dict]:
    """The given people, still on the roster with notifications on, with their status on `day`."""
    if not discord_ids:
        return []
    rows = conn.execute(
        f"SELECT r.discord_user_id::text AS discord_user_id, r.notify_mode, {EFFECTIVE_SQL} AS day_status, "
        "EXISTS (SELECT 1 FROM lore_event_helpers h WHERE h.event_id = %(event_id)s AND h.user_id = r.user_id) "
        "AS is_helper "
        f"FROM ({ROSTER_SQL}) r WHERE r.notify_mode <> 'off' AND r.discord_user_id::text = ANY(%(ids)s)",
        {"staff_roles": STAFF_ROLES, "day": day, "event_id": event_id, "ids": sorted(discord_ids)},
    ).fetchall()
    return [dict(row) for row in rows]


def _told(conn: database.Connection, event_id: int) -> set[str]:
    """Who was told the event is on since it was last cancelled."""
    rows = conn.execute(
        "SELECT DISTINCT discord_user_id FROM lore_notifications WHERE event_id = %(id)s "
        "AND kind = ANY(%(kinds)s) AND created_at > coalesce("
        " (SELECT max(created_at) FROM lore_notifications WHERE event_id = %(id)s AND kind = 'event_cancelled'),"
        " '-infinity'::timestamptz)",
        {"id": event_id, "kinds": list(SENT_KINDS)},
    ).fetchall()
    return {row["discord_user_id"] for row in rows}


def _context(conn: database.Connection, event: dict) -> dict[str, Any]:
    storyline = None
    if event.get("storyline_id"):
        row = conn.execute(
            "SELECT title FROM lore_storylines WHERE id = %s AND deleted_at IS NULL", (event["storyline_id"],)
        ).fetchone()
        storyline = row["title"] if row else None
    location = None
    if event.get("location_id"):
        row = conn.execute(
            "SELECT name, world, x, y, z FROM lore_locations WHERE id = %s AND deleted_at IS NULL",
            (event["location_id"],),
        ).fetchone()
        location = dict(row) if row else None
    return {
        "event_id": event["id"],
        "title": event["title"],
        "day": _iso(event["scheduled_on"]),
        "starts_at": _iso(event.get("starts_at")),
        "storyline": storyline,
        "location": location,
        "url": f"{site_url()}/lore/events/{event['id']}",
    }


def _enqueue(
    conn: database.Connection,
    kind: str,
    event_id: int,
    day: date,
    people: list[dict],
    base: dict[str, Any],
    *,
    replace: bool = True,
) -> None:
    if not people:
        return
    conflict = (
        "DO UPDATE SET payload = EXCLUDED.payload, created_at = now(), dispatched_at = NULL, acked_at = NULL"
        if replace
        else "DO NOTHING"
    )
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO lore_notifications (kind, event_id, discord_user_id, event_day, payload) "
            f"VALUES (%s, %s, %s, %s, %s) ON CONFLICT (event_id, kind, discord_user_id, event_day) {conflict}",
            [
                (
                    kind,
                    event_id,
                    person["discord_user_id"],
                    day,
                    database.Jsonb(
                        jsonable_encoder(
                            base
                            | {
                                "kind": kind,
                                "recipient_status": person.get("day_status"),
                                "recipient_is_helper": bool(person.get("is_helper")),
                            }
                        )
                    ),
                )
                for person in people
            ],
        )


def _scheduled(row: dict | None) -> bool:
    return bool(
        row is not None
        and row.get("deleted_at") is None
        and row.get("status") == "scheduled"
        and row.get("scheduled_on") is not None
    )


def on_event_change(conn: database.Connection, before: dict | None, after: dict) -> None:
    """Queue what the change from `before` (None for a new event) to `after` means for people."""
    was, now = _scheduled(before), _scheduled(after)
    event_id = after["id"]
    if now and not was:
        day = after["scheduled_on"]
        _enqueue(conn, "event_scheduled", event_id, day, _audience(conn, event_id, day), _context(conn, after))
    elif now and was:
        assert before is not None
        if before["scheduled_on"] == after["scheduled_on"] and before.get("starts_at") == after.get("starts_at"):
            return
        day = after["scheduled_on"]
        audience = {p["discord_user_id"]: p for p in _audience(conn, event_id, day)}
        for person in _people(conn, event_id, day, _told(conn, event_id) - set(audience)):
            audience[person["discord_user_id"]] = person
        base = _context(conn, after) | {
            "previous_day": _iso(before["scheduled_on"]),
            "previous_starts_at": _iso(before.get("starts_at")),
        }
        _enqueue(conn, "event_rescheduled", event_id, day, list(audience.values()), base)
    elif was and not now:
        assert before is not None
        if after.get("deleted_at") is None and after.get("status") == "done":
            return
        day = before["scheduled_on"]
        told = _told(conn, event_id)
        people = [{"discord_user_id": discord_id} for discord_id in sorted(told)]
        base = _context(conn, before) | {"reason": "deleted" if after.get("deleted_at") else after.get("status")}
        _enqueue(conn, "event_cancelled", event_id, day, people, base)


def on_helpers_added(conn: database.Connection, event: dict, user_ids: set[int]) -> None:
    """Tell newly assigned helpers about an event already scheduled, unless they already know."""
    if not user_ids or not _scheduled(event):
        return
    day = event["scheduled_on"]
    rows = conn.execute(
        f"SELECT r.discord_user_id::text AS discord_user_id, r.notify_mode, {EFFECTIVE_SQL} AS day_status, "
        "true AS is_helper "
        f"FROM ({ROSTER_SQL}) r WHERE r.notify_mode <> 'off' AND r.user_id = ANY(%(user_ids)s)",
        {"staff_roles": STAFF_ROLES, "day": day, "user_ids": sorted(user_ids)},
    ).fetchall()
    told = _told(conn, event["id"])
    people = [dict(row) for row in rows if row["discord_user_id"] and row["discord_user_id"] not in told]
    _enqueue(conn, "event_scheduled", event["id"], day, people, _context(conn, event), replace=False)


# --------------------
# Bot API
# --------------------


def outbox_id() -> str:
    """This database's outbox identity; the bot keys what it delivered by it (see wars)."""
    with database.connect() as conn:
        row = conn.execute("SELECT outbox_id FROM lore_notification_outbox WHERE id = 1").fetchone()
        if row is None:
            row = conn.execute(
                "INSERT INTO lore_notification_outbox (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET id = 1 "
                "RETURNING outbox_id"
            ).fetchone()
    return str(row["outbox_id"])


def _row(row: dict) -> dict:
    return {
        "id": row["id"],
        "kind": row["kind"],
        "event_id": row["event_id"],
        "discord_user_id": row["discord_user_id"],
        "event_day": _iso(row["event_day"]),
        "created_at": _iso(row["created_at"]),
        "payload": row["payload"],
    }


def pending(limit: int | None = None) -> list[dict]:
    """Undelivered rows, oldest first, stamped as dispatched. Handed-out rows return after ten minutes."""
    limit = max(1, min(MAX_LIMIT, DEFAULT_LIMIT if limit is None else int(limit)))
    with database.connect() as conn:
        rows = conn.execute(
            "WITH picked AS ("
            " SELECT id FROM lore_notifications"
            " WHERE acked_at IS NULL AND (dispatched_at IS NULL OR dispatched_at <= now() - %s)"
            " ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED)"
            " UPDATE lore_notifications n SET dispatched_at = now() FROM picked WHERE n.id = picked.id"
            " RETURNING n.*",
            (REDELIVER_AFTER, limit),
        ).fetchall()
    return [_row(row) for row in sorted(rows, key=lambda row: row["id"])]


def ack(ids: list[int]) -> list[int]:
    """Stamp `acked_at`; returns every given id that exists (acked now or before)."""
    wanted = sorted({int(i) for i in ids})
    if not wanted:
        return []
    with database.connect() as conn:
        conn.execute(
            "UPDATE lore_notifications SET acked_at = now() WHERE id = ANY(%s) AND acked_at IS NULL", (wanted,)
        )
        rows = conn.execute("SELECT id FROM lore_notifications WHERE id = ANY(%s) ORDER BY id", (wanted,)).fetchall()
    return [row["id"] for row in rows]
