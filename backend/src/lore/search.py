"""Quick search across every kind, for the link picker, the [[ mention menu and the header."""
from __future__ import annotations

from typing import Any

from src import database

from . import player_characters
from .entities import KINDS, _like
from .errors import bad

DEFAULT_LIMIT = 10
MAX_LIMIT = 50

# A short second line per kind.
_SUBLABEL = {
    "character": "coalesce(t.player_name, '')",
    "organisation": "t.kind",
    "storyline": "''",
    "location": "t.world || ' ' || t.x || ' ' || coalesce(t.y::text || ' ', '') || t.z",
    "event": "coalesce(to_char(t.scheduled_on, 'YYYY-MM-DD'), '')",
}


def search(
    q: str = "", kinds: str | list[str] | None = None, limit: int = DEFAULT_LIMIT, *, players: bool = False
) -> list[dict[str, Any]]:
    """Non-deleted items whose label contains `q`, prefix matches first; recently updated when `q` is empty.

    With `players`, a character search also finds players' roster characters that no lore character
    stands for yet: those come back with `id` 0 (no lore record has it) and a `player` key to adopt them by
    (player_characters.adopt). Without `q`, living ones fill the list after the lore records."""
    if isinstance(kinds, str):
        kinds = [k for k in (part.strip() for part in kinds.split(",")) if k]
    wanted = list(kinds or KINDS)
    if any(k not in KINDS for k in wanted):
        raise bad("bad_kind")
    limit = max(1, min(MAX_LIMIT, int(limit)))
    q = (q or "").strip()[:120]
    parts = []
    for name in dict.fromkeys(wanted):
        kind = KINDS[name]
        status = "t.status" if kind.statuses else "NULL::text"
        where = "t.deleted_at IS NULL" + (f" AND t.{kind.label} ILIKE %(q)s" if q else "")
        parts.append(
            f"(SELECT '{name}'::text AS kind, t.id, t.{kind.label} AS label, {_SUBLABEL[name]} AS sublabel, "
            f"{status} AS status, t.updated_at, "
            + (f"lower(t.{kind.label}) LIKE lower(%(prefix)s)" if q else "false")
            + " AS prefix, NULL::text AS player_uuid, NULL::text AS player_character_id"
            + f" FROM {kind.table} t WHERE {where} "
            + (f"ORDER BY prefix DESC, lower(t.{kind.label}), t.id " if q else "ORDER BY t.updated_at DESC, t.id ")
            + "LIMIT %(limit)s)"
        )
    if players and "character" in wanted:
        parts.append(player_characters.search_sql(q))
    # Lore records before players' characters: of the same name, or without a query, all of them.
    order = (
        "prefix DESC, lower(label), kind, id IS NULL, id, player_uuid, player_character_id"
        if q
        else "id IS NULL, id IS NULL AND status = 'dead', updated_at DESC, kind, id"
    )
    sql = (
        "SELECT kind, id, label, sublabel, status, player_uuid, player_character_id "
        f"FROM ({' UNION ALL '.join(parts)}) found ORDER BY {order} LIMIT %(limit)s"
    )
    with database.connect() as conn:
        rows = conn.execute(
            sql,
            {"q": _like(q), "prefix": _like(q)[1:], "limit": limit, "realm": player_characters.realm()},
        ).fetchall()
    return [_result(row) for row in rows]


def _result(row: dict) -> dict[str, Any]:
    item = dict(row)
    player_uuid, character_id = item.pop("player_uuid"), item.pop("player_character_id")
    if character_id is not None:
        item["id"] = 0
        item["player"] = {"uuid": player_uuid, "character_id": character_id}
    return item
