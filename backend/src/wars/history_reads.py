"""War history public reads: the war list, one war's page, one battle's report.

Callers check map access first; everything here is keyed by realm, which comes
from the map registry. Province names come from the map's own settlement and
installation markers, the same names the map's war pins use.
"""

from __future__ import annotations

import os
import threading

from src import database
from src.scripts.loader.markers import build_province_name_index, load_raw_markers
from src.scripts.util.dirs import input_file

from .history_ingest import load_events, load_records
from .history_model import ProvinceNames, build_battle_report, build_war_model, strip_codes

_LIST_LIMIT = 500
_FALSE = {"0", "false", "no", "off"}

# map id -> (mtime, size, {province id: name}); refreshed when map_markers.json changes.
_names_cache: dict[str, tuple[float, int, dict[int, str]]] = {}
_names_lock = threading.Lock()


def fighter_stats_public() -> bool:
    """WAR_FIGHTER_STATS_PUBLIC, default on. Off hides fighter tables and top fighters."""
    return os.environ.get("WAR_FIGHTER_STATS_PUBLIC", "").strip().lower() not in _FALSE


def province_names(map_id: str) -> ProvinceNames:
    path = input_file(map_id, "map_markers.json")
    try:
        stat = os.stat(path)
    except OSError:
        return lambda _province_id: None
    with _names_lock:
        cached = _names_cache.get(map_id)
    if cached is None or cached[:2] != (stat.st_mtime, stat.st_size):
        try:
            raw = load_raw_markers(map_id)
            index = build_province_name_index(raw["settlements"], raw["installations"])
        except (OSError, ValueError):
            index = {}
        cached = (stat.st_mtime, stat.st_size, index)
        with _names_lock:
            _names_cache[map_id] = cached
    index = cached[2]
    return lambda province_id: strip_codes(index.get(province_id) or "") or None


def clear_province_names_cache() -> None:
    with _names_lock:
        _names_cache.clear()


def list_wars(realm: str) -> list[dict]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT summary FROM wars WHERE realm_id = %s ORDER BY started_at DESC NULLS LAST, war_key DESC LIMIT %s",
            (realm, _LIST_LIMIT),
        ).fetchall()
    return [row["summary"] for row in rows if row["summary"]]


def _load(realm: str, war_key: str) -> tuple[list[dict], list[dict]]:
    with database.connect() as conn:
        return load_events(conn, realm, war_key), load_records(conn, realm, war_key)


def war_page(realm: str, war_key: str, map_id: str) -> dict | None:
    events, records = _load(realm, war_key)
    if not events and not records:
        return None
    return build_war_model(
        war_key, events, records,
        province_name=province_names(map_id),
        fighter_stats_public=fighter_stats_public(),
    )


def battle_report(realm: str, war_key: str, record_id: str, map_id: str) -> dict | None:
    events, records = _load(realm, war_key)
    return build_battle_report(
        war_key, events, records, record_id,
        province_name=province_names(map_id),
        fighter_stats_public=fighter_stats_public(),
    )
