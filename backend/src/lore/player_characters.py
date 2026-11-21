"""Players' characters from RPCharacters' roster (character_roster), as lore characters.

The link picker offers roster characters next to lore characters. Picking one
adopts it: the lore character linked to it is created, or the existing one is
reused, so every link (storylines, events, relations, affiliations) still points
at a lore character. The link fixes the player; the lore team keeps editing the
name, status and notes as usual.

The roster read is this site's realm (PROFILE_REALM_ID): main on www, dev on Dev.
"""
from __future__ import annotations

from typing import Any

from src import database
from src.skins.codes import site_profile_realm

from . import history
from .errors import LoreError, bad
from .people import Viewer

MAX_ID_LEN = 64

# The player's Minecraft name: their linked account first, then LuckPerms.
PLAYER_NAME_SQL = (
    "coalesce((SELECT d.minecraft_name FROM discord_links d WHERE d.player_uuid = {uuid}), "
    "(SELECT u.name FROM lp_users u WHERE u.uuid = {uuid}), '')"
)
LORE_STATUS_SQL = "CASE WHEN upper({status}) = 'DEAD' THEN 'dead' ELSE 'active' END"


def realm() -> str:
    """The realm whose roster characters the lore records offer: this site's."""
    return site_profile_realm()


def search_sql(q: str) -> str:
    """One UNION part for search.search, taking %(realm)s: roster characters with no live lore
    character yet. With a query, those whose name matches; without one, living characters first,
    most recently updated first, so an empty picker shows that players' characters are there too.
    """
    player_name = PLAYER_NAME_SQL.format(uuid="r.player_uuid")
    if q:
        match, prefix = "r.name ILIKE %(q)s", "lower(r.name) LIKE lower(%(prefix)s)"
        order = "prefix DESC, lower(r.name)"
    else:
        match, prefix = "true", "false"
        order = "upper(r.status) = 'DEAD', r.updated_at DESC"
    return (
        "(SELECT 'character'::text AS kind, NULL::bigint AS id, r.name AS label, "
        f"{player_name} AS sublabel, {LORE_STATUS_SQL.format(status='r.status')} AS status, "
        f"r.updated_at, {prefix} AS prefix, r.player_uuid, r.character_id AS player_character_id "
        "FROM character_roster r "
        f"WHERE r.realm_id = %(realm)s AND {match} AND NOT EXISTS ("
        " SELECT 1 FROM lore_characters c WHERE c.player_uuid = r.player_uuid AND c.rpc_realm_id = r.realm_id"
        " AND c.rpc_character_id = r.character_id AND c.deleted_at IS NULL) "
        f"ORDER BY {order}, r.player_uuid, r.character_id LIMIT %(limit)s)"
    )


def _key(value: Any, code: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > MAX_ID_LEN:
        raise bad(code)
    return value.strip()


def _brief(row: dict) -> dict:
    return {
        "kind": "character",
        "id": row["id"],
        "label": row["name"],
        "sublabel": row["player_name"] or "",
        "status": row["status"],
    }


def adopt(data: Any, actor: Viewer) -> dict:
    """The lore character for a roster character, created on first use. A deleted one is refused:
    restore it instead, so its history and links come back with it."""
    if not isinstance(data, dict):
        raise bad("bad_body")
    player_uuid = _key(data.get("player_uuid"), "bad_player_character")
    character_id = _key(data.get("character_id"), "bad_player_character")
    realm_id = realm()
    lookup = (
        "SELECT id, name, status, player_name, deleted_at FROM lore_characters "
        "WHERE player_uuid = %s AND rpc_realm_id = %s AND rpc_character_id = %s"
    )
    with database.connect() as conn:
        roster = conn.execute(
            f"SELECT r.name, {LORE_STATUS_SQL.format(status='r.status')} AS status, "
            f"{PLAYER_NAME_SQL.format(uuid='r.player_uuid')} AS player_name "
            "FROM character_roster r WHERE r.player_uuid = %s AND r.realm_id = %s AND r.character_id = %s",
            (player_uuid, realm_id, character_id),
        ).fetchone()
        if roster is None:
            raise bad("unknown_player_character")
        row = conn.execute(lookup + " FOR UPDATE", (player_uuid, realm_id, character_id)).fetchone()
        if row is None:
            name = roster["name"].strip()[:120] or character_id  # the lore name check wants 1-120 chars
            inserted = conn.execute(
                "INSERT INTO lore_characters (name, status, player_uuid, player_name, rpc_realm_id, "
                "rpc_character_id, created_by, updated_by) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (player_uuid, rpc_realm_id, rpc_character_id) WHERE rpc_character_id IS NOT NULL "
                "DO NOTHING RETURNING id, name, status, player_name, deleted_at",
                (name, roster["status"], player_uuid, roster["player_name"] or None, realm_id, character_id,
                 actor.user_id, actor.user_id),
            ).fetchone()
            if inserted is not None:
                history.record(
                    conn,
                    "character",
                    inserted["id"],
                    "created",
                    actor,
                    {
                        "name": [None, inserted["name"]],
                        "status": [None, inserted["status"]],
                        "player_character": [None, f"{roster['player_name'] or player_uuid} · {roster['name']}"],
                    },
                )
                return _brief(inserted) | {"created": True}
            # Someone adopted it at the same moment.
            row = conn.execute(lookup, (player_uuid, realm_id, character_id)).fetchone()
        if row["deleted_at"] is not None:
            raise LoreError(409, "player_character_deleted", {"id": row["id"]})
        return _brief(row) | {"created": False}


def roster_entry(conn: database.Connection, item: dict) -> dict | None:
    """The roster's current view of a linked lore character, for its page; None if not linked
    or gone from the roster."""
    if not item.get("rpc_character_id"):
        return None
    row = conn.execute(
        "SELECT name, upper(status) AS status, race, class, died_at FROM character_roster "
        "WHERE player_uuid = %s AND realm_id = %s AND character_id = %s",
        (item["player_uuid"], item["rpc_realm_id"], item["rpc_character_id"]),
    ).fetchone()
    return dict(row) if row else None
