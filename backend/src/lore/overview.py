"""The panel's front page: what is coming up, what still needs a date, recent changes, my week."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from src import database

from . import availability
from .entities import labels
from .people import Viewer

UPCOMING_DAYS = 14
UNSCHEDULED_LIMIT = 20
RECENT_LIMIT = 25


def overview(viewer: Viewer, today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    calendar = availability.calendar(today, today + timedelta(days=UPCOMING_DAYS - 1))
    with database.connect() as conn:
        recent = [
            dict(row)
            for row in conn.execute(
                "SELECT id, entity_kind, entity_id, action, actor_user_id, actor_name, at, changes "
                "FROM lore_history ORDER BY at DESC, id DESC LIMIT %s",
                (RECENT_LIMIT,),
            ).fetchall()
        ]
        named = labels(conn, [(row["entity_kind"], row["entity_id"]) for row in recent])
        for row in recent:
            row["target"] = named.get((row["entity_kind"], row["entity_id"]))
            if row["target"] is None and row["entity_kind"] == "team":
                names = row["changes"].get("name") or [None, None]
                row["target"] = {"kind": "team", "id": row["entity_id"], "label": names[1] or names[0] or "", "deleted": False, "status": None}
    me = availability.mine(viewer, today, today + timedelta(days=6))
    return {
        "today": today.isoformat(),
        "upcoming": calendar["events"],
        "unscheduled": calendar["unscheduled"][:UNSCHEDULED_LIMIT],
        "unscheduled_total": len(calendar["unscheduled"]),
        "recent": recent,
        "my_week": me["days"],
        "settings": me["settings"],
    }
