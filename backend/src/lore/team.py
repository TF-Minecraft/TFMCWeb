"""The read-only lore roster and the bot's Discord role snapshot."""
from __future__ import annotations

import re
from typing import Any

from src import database

from .errors import bad
from .people import roster

ROLES = ("helper", "lore_helper")
MAX_ROLE_IDS = 10_000
DISCORD_ID = re.compile(r"[0-9]{1,20}")


def team() -> dict[str, Any]:
    groups = {"lore_helpers": [], "helpers": [], "staff": []}
    group_keys = {"lore_helper": "lore_helpers", "helper": "helpers", "staff": "staff"}
    with database.transaction(isolation="repeatable read", read_only=True) as conn:
        for person in roster(conn):
            groups[group_keys[person["lore_role"]]].append(person)
        sync = conn.execute("SELECT synced_at FROM lore_discord_role_sync WHERE id").fetchone()
        unlinked = conn.execute(
            "SELECT count(DISTINCT r.discord_user_id) AS count FROM lore_discord_roles r "
            "WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.discord_user_id = r.discord_user_id AND NOT u.placeholder)"
        ).fetchone()["count"]
    return {**groups, "synced_at": sync["synced_at"] if sync else None, "unlinked": unlinked}


def sync_discord_roles(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict) or data.keys() != set(ROLES):
        raise bad("bad_discord_roles")

    snapshot = {}
    for role in ROLES:
        ids = data[role]
        if not isinstance(ids, list) or len(ids) > MAX_ROLE_IDS or any(
            not isinstance(value, str) or DISCORD_ID.fullmatch(value) is None for value in ids
        ):
            raise bad("bad_discord_roles")
        snapshot[role] = sorted(set(ids))

    # Serialise snapshots, including concurrent first syncs when both tables are empty.
    with database.transaction(lock="lore:discord-roles") as conn:
        changes = conn.execute(
            """
            WITH snapshot AS (
                SELECT unnest(%(helper)s::text[]) AS discord_user_id, 'helper' AS role
                UNION ALL
                SELECT unnest(%(lore_helper)s::text[]), 'lore_helper'
            ), removed AS (
                DELETE FROM lore_discord_roles r WHERE NOT EXISTS (
                    SELECT 1 FROM snapshot s WHERE (s.discord_user_id, s.role) = (r.discord_user_id, r.role)
                ) RETURNING 1
            ), added AS (
                INSERT INTO lore_discord_roles (discord_user_id, role) SELECT discord_user_id, role FROM snapshot
                ON CONFLICT DO NOTHING RETURNING 1
            )
            SELECT (SELECT count(*) FROM added) AS added, (SELECT count(*) FROM removed) AS removed
            """,
            snapshot,
        ).fetchone()
        sync = conn.execute(
            "INSERT INTO lore_discord_role_sync (synced_at) VALUES (now()) "
            "ON CONFLICT (id) DO UPDATE SET synced_at = EXCLUDED.synced_at RETURNING synced_at"
        ).fetchone()
    return {role: len(ids) for role, ids in snapshot.items()} | changes | sync
