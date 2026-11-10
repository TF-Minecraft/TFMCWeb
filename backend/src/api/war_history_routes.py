"""Public war history reads: the war list, a war's page and a battle's report.

Gated by the map's access rules, like every other map read; the realm comes
from the map registry. Plain `def` handlers, so FastAPI runs the synchronous
database reads in its threadpool. Shapes: docs/docs/map/war-history.md and
`frontend/lib/wars/types.ts`.
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from src.api.map_access import ensure_map_access
from src.scripts.chronicle.store import realm_for_map
from src.wars.history_model import WAR_KEY_RE
from src.wars.history_reads import battle_report, list_wars, war_page

war_history_router = APIRouter(tags=["wars"])


def _war_key(value: str) -> str:
    if not WAR_KEY_RE.match(value or ""):
        raise HTTPException(status_code=404, detail="War not found")
    return value


@war_history_router.get("/{map_name}/wars")
def get_wars(map_name: str, authorization: str | None = Header(default=None)):
    entry = ensure_map_access(map_name, authorization)
    return {"map_id": entry.id, "wars": list_wars(realm_for_map(entry.id))}


@war_history_router.get("/{map_name}/wars/{war_key}")
def get_war(map_name: str, war_key: str, authorization: str | None = Header(default=None)):
    entry = ensure_map_access(map_name, authorization)
    model = war_page(realm_for_map(entry.id), _war_key(war_key), entry.id)
    if model is None:
        raise HTTPException(status_code=404, detail="War not found")
    return {"map_id": entry.id, **model}


@war_history_router.get("/{map_name}/wars/{war_key}/battles/{record_id}")
def get_war_battle(
    map_name: str,
    war_key: str,
    record_id: str,
    authorization: str | None = Header(default=None),
):
    entry = ensure_map_access(map_name, authorization)
    report = battle_report(realm_for_map(entry.id), _war_key(war_key), record_id[:160], entry.id)
    if report is None:
        raise HTTPException(status_code=404, detail="Battle not found")
    return {"map_id": entry.id, **report}
