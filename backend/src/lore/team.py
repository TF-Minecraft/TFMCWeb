"""The lore team: approved Lore Helpers (`lore_members`), managed by staff and team leads.

Website staff always have access and need no row. Removing someone keeps their
helper assignments and history; they just lose access and leave the roster.
"""
from __future__ import annotations

from typing import Any

from src import database

from . import history
from .entities import _like
from .errors import LoreError, bad, not_found
from .people import NAME_SQL, PERSON_JOINS, STAFF_ROLES, Viewer, roster

CANDIDATE_LIMIT = 20
HISTORY_KIND = "team"


def _forbidden() -> LoreError:
    return LoreError(403, "forbidden")


def team() -> dict[str, Any]:
    """Members (with who added them) and staff on the roster."""
    with database.connect() as conn:
        members = conn.execute(
            f"SELECT m.user_id, {NAME_SQL} AS name, dl.player_uuid IS NOT NULL AS has_head, m.is_lead, "
            "m.added_at, m.added_by, "
            "(SELECT coalesce(nullif(adl.minecraft_name, ''), nullif(a.discord_global_name, ''), "
            "  nullif(a.discord_username, ''), 'account ' || a.id) "
            " FROM users a LEFT JOIN discord_links adl ON adl.discord_user_id = a.discord_user_id "
            " WHERE a.id = m.added_by) AS added_by_name, "
            "u.role = ANY(%(staff_roles)s) AS is_staff "
            f"FROM lore_members m JOIN users u ON u.id = m.user_id {PERSON_JOINS} "
            f"ORDER BY m.is_lead DESC, lower({NAME_SQL}), m.user_id",
            {"staff_roles": STAFF_ROLES},
        ).fetchall()
        staff = [p for p in roster(conn) if p["is_staff"] and not p["is_member"]]
    return {"members": [dict(row) for row in members], "staff": staff}


def candidates(q: str) -> list[dict]:
    """Signed-in website accounts matching `q` (2+ characters) that are not on the team yet."""
    q = (q or "").strip()[:64]
    if len(q) < 2:
        return []
    with database.connect() as conn:
        rows = conn.execute(
            f"SELECT u.id AS user_id, {NAME_SQL} AS name, dl.player_uuid IS NOT NULL AS has_head, "
            "u.role = ANY(%(staff_roles)s) AS is_staff "
            f"FROM users u {PERSON_JOINS} "
            "WHERE NOT u.placeholder AND NOT EXISTS (SELECT 1 FROM lore_members m WHERE m.user_id = u.id) "
            "AND (dl.minecraft_name ILIKE %(q)s OR u.discord_username ILIKE %(q)s OR u.discord_global_name ILIKE %(q)s) "
            f"ORDER BY (lower({NAME_SQL}) LIKE lower(%(prefix)s)) DESC, lower({NAME_SQL}), u.id LIMIT %(limit)s",
            {
                "staff_roles": STAFF_ROLES,
                "q": _like(q),
                "prefix": _like(q)[1:],
                "limit": CANDIDATE_LIMIT,
            },
        ).fetchall()
    return [dict(row) for row in rows]


def _user_id(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise bad("bad_user")
    return value


def _is_lead(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if not isinstance(value, bool):
        raise bad("bad_is_lead")
    return value


def _member(conn: database.Connection, user_id: int) -> dict:
    row = conn.execute(
        f"SELECT m.user_id, {NAME_SQL} AS name, dl.player_uuid IS NOT NULL AS has_head, m.is_lead, m.added_at, "
        "m.added_by, u.role = ANY(%(staff_roles)s) AS is_staff "
        f"FROM lore_members m JOIN users u ON u.id = m.user_id {PERSON_JOINS} WHERE m.user_id = %(user_id)s",
        {"staff_roles": STAFF_ROLES, "user_id": user_id},
    ).fetchone()
    if row is None:
        raise not_found()
    return dict(row)


def _guard(actor: Viewer, user_id: int) -> None:
    if not actor.can_manage_team:
        raise _forbidden()
    if user_id == actor.user_id and not actor.is_staff:
        raise LoreError(403, "cannot_change_self")


def add(data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    user_id = _user_id(data.get("user_id"))
    _guard(actor, user_id)
    is_lead = _is_lead(data.get("is_lead"))
    with database.connect() as conn:
        user = conn.execute("SELECT id, placeholder FROM users WHERE id = %s", (user_id,)).fetchone()
        if user is None or user["placeholder"]:
            raise not_found()
        inserted = conn.execute(
            "INSERT INTO lore_members (user_id, is_lead, added_by) VALUES (%s, %s, %s) "
            "ON CONFLICT (user_id) DO NOTHING RETURNING user_id",
            (user_id, is_lead, actor.user_id),
        ).fetchone()
        if inserted is None:
            raise LoreError(409, "already_member")
        member = _member(conn, user_id)
        history.record(conn, HISTORY_KIND, user_id, "added", actor, {"name": [None, member["name"]], "is_lead": [None, is_lead]})
        return member


def update(user_id: int, data: Any, actor: Viewer) -> dict:
    _guard(actor, user_id)
    if not isinstance(data, dict) or "is_lead" not in data:
        raise bad("bad_body")
    is_lead = _is_lead(data.get("is_lead"))
    with database.connect() as conn:
        before = conn.execute("SELECT is_lead FROM lore_members WHERE user_id = %s FOR UPDATE", (user_id,)).fetchone()
        if before is None:
            raise not_found()
        if before["is_lead"] == is_lead:
            return _member(conn, user_id)
        conn.execute("UPDATE lore_members SET is_lead = %s WHERE user_id = %s", (is_lead, user_id))
        member = _member(conn, user_id)
        # The name rides along so the activity feed can label the entry.
        history.record(
            conn, HISTORY_KIND, user_id, "updated", actor,
            {"name": [member["name"], member["name"]], "is_lead": [before["is_lead"], is_lead]},
        )
        return member


def remove(user_id: int, actor: Viewer) -> dict:
    _guard(actor, user_id)
    with database.connect() as conn:
        member = _member(conn, user_id)
        conn.execute("DELETE FROM lore_members WHERE user_id = %s", (user_id,))
        history.record(conn, HISTORY_KIND, user_id, "removed", actor, {"name": [member["name"], None]})
    return {"ok": True}
