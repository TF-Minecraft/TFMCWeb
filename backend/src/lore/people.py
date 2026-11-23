"""Panel access and the roster of people who can be assigned and notified."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from src import database
from src.auth import roles

STAFF_ROLES = [role for role in roles.ROLES if roles.is_staff(role)]
AccessLevel = Literal["full", "calendar"]

# A person's display name: their linked Minecraft name, else their Discord name.
NAME_SQL = (
    "coalesce(nullif(dl.minecraft_name, ''), nullif(u.discord_global_name, ''), "
    "nullif(u.discord_username, ''), 'account ' || u.id)"
)
PERSON_JOINS = "LEFT JOIN discord_links dl ON dl.discord_user_id = u.discord_user_id"
_ROLE_JOINS = """
LEFT JOIN lore_discord_roles lh ON lh.discord_user_id = u.discord_user_id AND lh.role = 'lore_helper'
LEFT JOIN lore_discord_roles h ON h.discord_user_id = u.discord_user_id AND h.role = 'helper'
"""


@dataclass(frozen=True)
class Viewer:
    user_id: int
    name: str
    is_staff: bool
    is_lore_helper: bool
    is_helper: bool
    player_uuid: str | None

    @property
    def level(self) -> AccessLevel | None:
        if self.is_staff or self.is_lore_helper:
            return "full"
        return "calendar" if self.is_helper else None

    @property
    def access(self) -> bool:
        return self.level is not None

    @property
    def full(self) -> bool:
        return self.level == "full"

    @property
    def default_notify_mode(self) -> str:
        return "available" if self.full else "assigned"

    def public(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "is_staff": self.is_staff,
            "is_lore_helper": self.is_lore_helper,
            "is_helper": self.is_helper,
        }


def viewer(user: dict) -> Viewer:
    """The panel's view of a signed-in session user (from `users.session_user`)."""
    user_id = int(user["user_id"])
    with database.connect() as conn:
        row = conn.execute(
            f"SELECT {NAME_SQL} AS name, dl.player_uuid, "
            "lh.discord_user_id IS NOT NULL AS is_lore_helper, h.discord_user_id IS NOT NULL AS is_helper "
            f"FROM users u {PERSON_JOINS} {_ROLE_JOINS} WHERE u.id = %s",
            (user_id,),
        ).fetchone()
    return Viewer(
        user_id=user_id,
        name=(row or {}).get("name") or f"account {user_id}",
        is_staff=roles.is_staff(str(user.get("role") or "")),
        is_lore_helper=bool(row and row["is_lore_helper"]),
        is_helper=bool(row and row["is_helper"]),
        player_uuid=(row or {}).get("player_uuid") or None,
    )


_IS_STAFF = "u.role = ANY(%(staff_roles)s)"
_IS_FULL = f"({_IS_STAFF} OR lh.discord_user_id IS NOT NULL)"
# Lore Helpers and Helpers are on the roster from their first sign-in, so they can be
# assigned (or sign up) before they open the panel. Other staff join with a profile.
ROSTER_SQL = f"""
SELECT u.id AS user_id, u.discord_user_id, {NAME_SQL} AS name, dl.player_uuid,
       CASE WHEN {_IS_FULL} THEN 'full' ELSE 'calendar' END AS level,
       CASE WHEN {_IS_STAFF} THEN 'staff'
            WHEN lh.discord_user_id IS NOT NULL THEN 'lore_helper' ELSE 'helper' END AS lore_role,
       p.timezone,
       coalesce(p.notify_mode, CASE WHEN {_IS_FULL} THEN 'available' ELSE 'assigned' END) AS notify_mode
FROM users u
{PERSON_JOINS}
{_ROLE_JOINS}
LEFT JOIN lore_profiles p ON p.user_id = u.id
WHERE NOT u.placeholder AND (
    lh.discord_user_id IS NOT NULL OR h.discord_user_id IS NOT NULL OR (p.user_id IS NOT NULL AND {_IS_STAFF})
)
"""


def roster(conn: database.Connection) -> list[dict]:
    rows = conn.execute(ROSTER_SQL + " ORDER BY lower(" + NAME_SQL + "), u.id", {"staff_roles": STAFF_ROLES}).fetchall()
    return [person(row) for row in rows]


def roster_ids(conn: database.Connection) -> set[int]:
    rows = conn.execute(
        f"SELECT user_id FROM ({ROSTER_SQL}) r", {"staff_roles": STAFF_ROLES}
    ).fetchall()
    return {row["user_id"] for row in rows}


def person(row: dict) -> dict:
    """The public shape of a roster row."""
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "level": row["level"],
        "lore_role": row["lore_role"],
        "timezone": row["timezone"],
        "notify_mode": row["notify_mode"],
        "has_head": bool(row["player_uuid"]),
    }


def ensure_profile(conn: database.Connection, viewer: Viewer) -> None:
    conn.execute(
        "INSERT INTO lore_profiles (user_id, notify_mode) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING",
        (viewer.user_id, viewer.default_notify_mode),
    )


def head_uuid(user_id: int) -> str | None:
    """The linked player of a roster member, for their head."""
    with database.connect() as conn:
        row = conn.execute(
            f"SELECT r.player_uuid FROM ({ROSTER_SQL}) r WHERE r.user_id = %(user_id)s",
            {"staff_roles": STAFF_ROLES, "user_id": user_id},
        ).fetchone()
    return (row or {}).get("player_uuid") or None
