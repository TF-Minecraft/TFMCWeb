"""Who may use the panel, and the roster of people who can be assigned and notified.

Access: website staff (`roles.is_staff`) or a row in `lore_members` (the Lore
Helpers, managed in the panel). The roster: every lore member, plus staff who
joined it by saving their availability or settings once (a `lore_profiles` row).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from src import database
from src.auth import roles

STAFF_ROLES = [role for role in roles.ROLES if roles.is_staff(role)]

# A person's display name: their linked Minecraft name, else their Discord name.
NAME_SQL = (
    "coalesce(nullif(dl.minecraft_name, ''), nullif(u.discord_global_name, ''), "
    "nullif(u.discord_username, ''), 'account ' || u.id)"
)
PERSON_JOINS = "LEFT JOIN discord_links dl ON dl.discord_user_id = u.discord_user_id"


@dataclass(frozen=True)
class Viewer:
    user_id: int
    name: str
    role: str
    is_staff: bool
    is_member: bool
    is_lead: bool
    player_uuid: str | None

    @property
    def access(self) -> bool:
        return self.is_staff or self.is_member

    @property
    def can_manage_team(self) -> bool:
        return self.is_staff or self.is_lead

    def public(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "is_staff": self.is_staff,
            "is_lead": self.is_lead,
            "is_member": self.is_member,
        }


def viewer(user: dict) -> Viewer:
    """The panel's view of a signed-in session user (from `users.session_user`)."""
    user_id = int(user["user_id"])
    with database.connect() as conn:
        row = conn.execute(
            f"SELECT {NAME_SQL} AS name, dl.player_uuid, m.user_id IS NOT NULL AS is_member, "
            "coalesce(m.is_lead, false) AS is_lead "
            f"FROM users u {PERSON_JOINS} LEFT JOIN lore_members m ON m.user_id = u.id WHERE u.id = %s",
            (user_id,),
        ).fetchone()
    role = str(user.get("role") or "")
    return Viewer(
        user_id=user_id,
        name=(row or {}).get("name") or f"account {user_id}",
        role=role,
        is_staff=roles.is_staff(role),
        is_member=bool(row and row["is_member"]),
        is_lead=bool(row and row["is_lead"]),
        player_uuid=(row or {}).get("player_uuid") or None,
    )


ROSTER_SQL = f"""
SELECT u.id AS user_id, u.discord_user_id, u.role, {NAME_SQL} AS name, dl.player_uuid,
       m.user_id IS NOT NULL AS is_member, coalesce(m.is_lead, false) AS is_lead,
       u.role = ANY(%(staff_roles)s) AS is_staff,
       p.timezone, coalesce(p.notify_mode, 'available') AS notify_mode
FROM users u
{PERSON_JOINS}
LEFT JOIN lore_members m ON m.user_id = u.id
LEFT JOIN lore_profiles p ON p.user_id = u.id
WHERE m.user_id IS NOT NULL OR (u.role = ANY(%(staff_roles)s) AND p.user_id IS NOT NULL)
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
    """The public shape of a roster row: never the Discord id."""
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "is_staff": bool(row["is_staff"]),
        "is_member": bool(row["is_member"]),
        "is_lead": bool(row["is_lead"]),
        "timezone": row.get("timezone"),
        "notify_mode": row.get("notify_mode") or "available",
        "has_head": bool(row.get("player_uuid")),
    }


def ensure_profile(conn: database.Connection, user_id: int) -> None:
    """Staff join the roster by saving their availability or settings once."""
    conn.execute("INSERT INTO lore_profiles (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user_id,))


def head_uuid(user_id: int) -> str | None:
    """The linked player of a roster member, for their head; None for anyone off the roster."""
    with database.connect() as conn:
        row = conn.execute(
            f"SELECT r.player_uuid FROM ({ROSTER_SQL}) r WHERE r.user_id = %(user_id)s",
            {"staff_roles": STAFF_ROLES, "user_id": user_id},
        ).fetchone()
    return (row or {}).get("player_uuid") or None
