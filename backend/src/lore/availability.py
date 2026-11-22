"""Day-level availability (Full, Partial, None; no answer is "not set"), personal
settings, and the calendar that puts events next to who can help.

A person's status on a day is that day's override if they set one, else their
weekly default for the weekday, else not set (`None`).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src import database

from .errors import bad
from .people import ROSTER_SQL, STAFF_ROLES, Viewer, ensure_profile, roster

STATUSES = ("full", "partial", "none")
NOTIFY_MODES = ("off", "assigned", "available", "all")
MAX_DAYS = 62
NOTE_MAX = 200


def parse_day(value: Any, code: str = "bad_day") -> date:
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise bad(code)
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise bad(code) from None


def day_range(start: Any, end: Any) -> tuple[date, date]:
    """A validated inclusive range of at most 62 days."""
    first, last = parse_day(start, "bad_range"), parse_day(end, "bad_range")
    if first > last:
        raise bad("bad_range")
    if (last - first).days + 1 > MAX_DAYS:
        raise bad("range_too_long")
    return first, last


def days(first: date, last: date) -> list[date]:
    return [first + timedelta(days=n) for n in range((last - first).days + 1)]


def _status(value: Any) -> str | None:
    if value is None:
        return None
    if value not in STATUSES:
        raise bad("bad_status")
    return value


def _note(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str) or len(value) > NOTE_MAX:
        raise bad("bad_note")
    return value.strip()


def effective(weekly: dict[int, dict], overrides: dict[date, dict], day: date) -> dict:
    """{status, note, source} for one person on `day`; source is override, weekly or None."""
    if day in overrides:
        return {"status": overrides[day]["status"], "note": overrides[day]["note"], "source": "override"}
    if day.weekday() in weekly:
        entry = weekly[day.weekday()]
        return {"status": entry["status"], "note": entry["note"], "source": "weekly"}
    return {"status": None, "note": "", "source": None}


def _load(conn: database.Connection, user_ids: list[int], first: date, last: date):
    weekly: dict[int, dict[int, dict]] = {user_id: {} for user_id in user_ids}
    overrides: dict[int, dict[date, dict]] = {user_id: {} for user_id in user_ids}
    if not user_ids:
        return weekly, overrides
    for row in conn.execute(
        "SELECT user_id, weekday, status, note FROM lore_weekly_availability WHERE user_id = ANY(%s)", (user_ids,)
    ).fetchall():
        weekly[row["user_id"]][row["weekday"]] = {"status": row["status"], "note": row["note"]}
    for row in conn.execute(
        "SELECT user_id, day, status, note FROM lore_availability WHERE user_id = ANY(%s) AND day BETWEEN %s AND %s",
        (user_ids, first, last),
    ).fetchall():
        overrides[row["user_id"]][row["day"]] = {"status": row["status"], "note": row["note"]}
    return weekly, overrides


def _roster_status(weekly: dict, overrides: dict, user_id: int, day: date, full: bool) -> dict:
    status = effective(weekly[user_id], overrides[user_id], day)
    if not full:
        status["note"] = ""
    return status


def _grid(conn: database.Connection, first: date, last: date, *, full: bool) -> dict[str, Any]:
    people = roster(conn)
    ids = [p["user_id"] for p in people]
    weekly, overrides = _load(conn, ids, first, last)
    range_days = days(first, last)
    return {
        "from": first.isoformat(),
        "to": last.isoformat(),
        "days": [d.isoformat() for d in range_days],
        "people": [
            p
            | {
                "days": {
                    d.isoformat(): _roster_status(weekly, overrides, p["user_id"], d, full) for d in range_days
                }
            }
            for p in people
        ],
    }


def grid(viewer: Viewer, start: Any, end: Any) -> dict[str, Any]:
    """Roster x days: every roster member's effective status for each day in the range."""
    first, last = day_range(start, end)
    with database.connect() as conn:
        return _grid(conn, first, last, full=viewer.full)


# --------------------
# Me
# --------------------


def _settings(conn: database.Connection, viewer: Viewer) -> dict[str, Any]:
    row = conn.execute("SELECT timezone, notify_mode FROM lore_profiles WHERE user_id = %s", (viewer.user_id,)).fetchone()
    return {
        "timezone": (row or {}).get("timezone"),
        "notify_mode": (row or {}).get("notify_mode") or viewer.default_notify_mode,
    }


def saved_timezone(viewer: Viewer) -> str | None:
    with database.connect() as conn:
        return _settings(conn, viewer)["timezone"]


def _on_roster(conn: database.Connection, viewer: Viewer) -> bool:
    return conn.execute(
        f"SELECT 1 FROM ({ROSTER_SQL}) r WHERE r.user_id = %(user_id)s",
        {"staff_roles": STAFF_ROLES, "user_id": viewer.user_id},
    ).fetchone() is not None


def _me(conn: database.Connection, viewer: Viewer, first: date, last: date) -> dict[str, Any]:
    weekly, overrides = _load(conn, [viewer.user_id], first, last)
    mine_weekly, mine_overrides = weekly[viewer.user_id], overrides[viewer.user_id]
    return {
        "from": first.isoformat(),
        "to": last.isoformat(),
        "weekly": [
            {"weekday": n, "status": (mine_weekly.get(n) or {}).get("status"), "note": (mine_weekly.get(n) or {}).get("note", "")}
            for n in range(7)
        ],
        "days": [
            {"day": d.isoformat(), **effective(mine_weekly, mine_overrides, d)} for d in days(first, last)
        ],
        "settings": _settings(conn, viewer) | {"on_roster": _on_roster(conn, viewer)},
    }


def mine(viewer: Viewer, start: Any, end: Any) -> dict[str, Any]:
    first, last = day_range(start, end)
    with database.connect() as conn:
        return _me(conn, viewer, first, last)


def set_weekly(viewer: Viewer, data: Any) -> dict[str, Any]:
    """Replace the weekly defaults: seven entries (Monday first), status or null and a note."""
    entries = data.get("weekly") if isinstance(data, dict) else None
    if not isinstance(entries, list) or len(entries) != 7:
        raise bad("bad_weekly")
    rows = []
    for weekday, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise bad("bad_weekly")
        status = _status(entry.get("status"))
        if status is not None:
            rows.append((viewer.user_id, weekday, status, _note(entry.get("note"))))
    today = date.today()
    with database.connect() as conn:
        ensure_profile(conn, viewer)
        conn.execute("DELETE FROM lore_weekly_availability WHERE user_id = %s", (viewer.user_id,))
        if rows:
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO lore_weekly_availability (user_id, weekday, status, note) VALUES (%s, %s, %s, %s)",
                    rows,
                )
        return _me(conn, viewer, today, today + timedelta(days=MAX_DAYS - 1))


def set_days(viewer: Viewer, data: Any) -> dict[str, Any]:
    """Set or clear (status null) day overrides; at most 62 days per call."""
    entries = data.get("days") if isinstance(data, dict) else None
    if not isinstance(entries, list) or not entries or len(entries) > MAX_DAYS:
        raise bad("bad_days")
    wanted: dict[date, tuple[str | None, str]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise bad("bad_days")
        wanted[parse_day(entry.get("day"))] = (_status(entry.get("status")), _note(entry.get("note")))
    cleared = sorted(day for day, (status, _) in wanted.items() if status is None)
    rows = [(viewer.user_id, day, status, note) for day, (status, note) in sorted(wanted.items()) if status]
    with database.connect() as conn:
        ensure_profile(conn, viewer)
        if cleared:
            conn.execute(
                "DELETE FROM lore_availability WHERE user_id = %s AND day = ANY(%s)", (viewer.user_id, cleared)
            )
        if rows:
            with conn.cursor() as cur:
                cur.executemany(
                    "INSERT INTO lore_availability (user_id, day, status, note) VALUES (%s, %s, %s, %s) "
                    "ON CONFLICT (user_id, day) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note",
                    rows,
                )
        first, last = min(wanted), max(wanted)
        if (last - first).days + 1 > MAX_DAYS:
            last = first + timedelta(days=MAX_DAYS - 1)
        return _me(conn, viewer, first, last)


def set_settings(viewer: Viewer, data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise bad("bad_body")
    updates: dict[str, Any] = {}
    if "timezone" in data:
        timezone = data["timezone"]
        if timezone in (None, ""):
            updates["timezone"] = None
        else:
            if not isinstance(timezone, str) or len(timezone) > 64:
                raise bad("bad_timezone")
            try:
                ZoneInfo(timezone)
            except (ZoneInfoNotFoundError, ValueError):
                raise bad("bad_timezone") from None
            updates["timezone"] = timezone
    if "notify_mode" in data:
        if data["notify_mode"] not in NOTIFY_MODES:
            raise bad("bad_notify_mode")
        updates["notify_mode"] = data["notify_mode"]
    with database.connect() as conn:
        ensure_profile(conn, viewer)
        if updates:
            conn.execute(
                "UPDATE lore_profiles SET "
                + ", ".join(f"{name} = %({name})s" for name in updates)
                + ", updated_at = now() WHERE user_id = %(user_id)s",
                updates | {"user_id": viewer.user_id},
            )
        return _settings(conn, viewer) | {"on_roster": _on_roster(conn, viewer)}


# --------------------
# Calendar
# --------------------

_UNSCHEDULED_LIMIT = 200


def calendar(viewer: Viewer, start: Any, end: Any) -> dict[str, Any]:
    """Scheduled events in the range, the roster's availability for it, and what is not yet scheduled."""
    first, last = day_range(start, end)
    with database.connect() as conn:
        events = conn.execute(
            "SELECT e.id, e.title, e.status, e.scheduled_on, e.starts_at, e.storyline_id, s.title AS storyline_title, "
            "e.location_id, l.name AS location_name, l.world, l.x, l.y, l.z, "
            "coalesce((SELECT array_agg(h.user_id ORDER BY h.user_id) FROM lore_event_helpers h "
            " WHERE h.event_id = e.id), '{}') AS helper_ids "
            "FROM lore_events e "
            "LEFT JOIN lore_storylines s ON s.id = e.storyline_id AND s.deleted_at IS NULL "
            "LEFT JOIN lore_locations l ON l.id = e.location_id AND l.deleted_at IS NULL "
            "WHERE e.deleted_at IS NULL AND e.scheduled_on BETWEEN %s AND %s AND e.status IN ('scheduled', 'done') "
            "ORDER BY e.scheduled_on, e.starts_at NULLS LAST, e.id",
            (first, last),
        ).fetchall()
        unscheduled = []
        if viewer.full:
            unscheduled = conn.execute(
                "SELECT e.id, e.title, e.status, e.waiting_on, e.storyline_id, s.title AS storyline_title, e.updated_at "
                "FROM lore_events e LEFT JOIN lore_storylines s ON s.id = e.storyline_id AND s.deleted_at IS NULL "
                "WHERE e.deleted_at IS NULL AND e.status IN ('idea', 'waiting') "
                "ORDER BY e.status DESC, e.updated_at DESC, e.id LIMIT %s",
                (_UNSCHEDULED_LIMIT,),
            ).fetchall()
        availability = _grid(conn, first, last, full=viewer.full)
    return {
        "from": first.isoformat(),
        "to": last.isoformat(),
        "events": [_calendar_event(row, viewer.full) for row in events],
        "unscheduled": [dict(row) for row in unscheduled],
        "availability": availability,
    }


def _calendar_event(row: dict, full: bool) -> dict:
    item = {key: row[key] for key in ("id", "title", "status", "scheduled_on", "starts_at", "helper_ids")}
    if not full:
        location = {"label": row["location_name"]} if row["location_name"] is not None else None
        return {**item, "storyline": None, "location": location}
    item["storyline"] = (
        {"id": row["storyline_id"], "label": row["storyline_title"]} if row["storyline_title"] is not None else None
    )
    item["location"] = (
        {"id": row["location_id"], "label": row["location_name"], "world": row["world"], "x": row["x"], "y": row["y"], "z": row["z"]}
        if row["location_name"] is not None
        else None
    )
    return item


def roster_on(viewer: Viewer, day: Any) -> list[dict]:
    """Every roster member's status on one day, for the event date picker."""
    target = parse_day(day)
    with database.connect() as conn:
        people = roster(conn)
        weekly, overrides = _load(conn, [p["user_id"] for p in people], target, target)
    return [p | _roster_status(weekly, overrides, p["user_id"], target, viewer.full) for p in people]

