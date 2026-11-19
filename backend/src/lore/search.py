"""Quick search across every kind, for the link picker, the [[ mention menu and the header."""
from __future__ import annotations

from typing import Any

from src import database

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


def search(q: str = "", kinds: str | list[str] | None = None, limit: int = DEFAULT_LIMIT) -> list[dict[str, Any]]:
    """Non-deleted items whose label contains `q`, prefix matches first; recently updated when `q` is empty."""
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
            + f" AS prefix FROM {kind.table} t WHERE {where} "
            + (f"ORDER BY prefix DESC, lower(t.{kind.label}), t.id " if q else "ORDER BY t.updated_at DESC, t.id ")
            + "LIMIT %(limit)s)"
        )
    order = "prefix DESC, lower(label), kind, id" if q else "updated_at DESC, kind, id"
    sql = f"SELECT kind, id, label, sublabel, status FROM ({' UNION ALL '.join(parts)}) found ORDER BY {order} LIMIT %(limit)s"
    with database.connect() as conn:
        rows = conn.execute(sql, {"q": _like(q), "prefix": _like(q)[1:], "limit": limit}).fetchall()
    return [dict(row) for row in rows]
