"""War history ingest: SimpleFactions posts war events and battle records.

SF keeps an outbox and resends until an item is acked, so both routes are
idempotent: an id already stored is ignored and acked again. A malformed item
is logged, acked and listed under ``rejected`` so one bad line cannot block the
queue behind it. Only a malformed request (no list, an unusable realm, too many
items) is refused as a whole.

After storing, each war touched by the batch is recomputed from everything
stored for it (`refresh_war`), so events and records may arrive in any order.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from src import database
from src.skins.codes import CodeError, normalize_realm_id

from .history_model import (
    EVENT_TYPES,
    WAR_KEY_RE,
    build_war_model,
    build_war_summary,
    from_epoch_ms,
    parse_instant,
)

logger = logging.getLogger("wars.history")

# SF sends at most 50 per batch; a backfill may be resent in bigger ones by hand.
MAX_ITEMS = 200
MAX_BODY_BYTES = 8 * 1024 * 1024
MAX_EVENT_BYTES = 256 * 1024
MAX_RECORD_FIGHTERS = 1000
MAX_RECORD_SIDES = 16
_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,160}$")
# Instants before SimpleFactions existed, or far past this server's clock, are broken clocks.
_MIN_AT = datetime(2020, 1, 1, tzinfo=timezone.utc)
_MAX_SKEW = timedelta(days=2)


class WarHistoryRequestError(ValueError):
    """The request as a whole is unusable (as opposed to one bad item in it)."""


class _Rejected(ValueError):
    pass


def _realm(raw: Any) -> str:
    if raw is not None and not isinstance(raw, str):
        raise WarHistoryRequestError("realm_id must be a string")
    try:
        return normalize_realm_id(raw)
    except CodeError as e:
        raise WarHistoryRequestError(str(e)) from e


def _items(body: Any, key: str) -> tuple[str, list]:
    if not isinstance(body, dict):
        raise WarHistoryRequestError("Body must be a JSON object")
    items = body.get(key)
    if not isinstance(items, list):
        raise WarHistoryRequestError(f"{key} must be a list")
    if len(items) > MAX_ITEMS:
        raise WarHistoryRequestError(f"At most {MAX_ITEMS} {key} per request")
    return _realm(body.get("realm_id")), items


def _item_id(item: Any) -> str | None:
    raw = item.get("id") if isinstance(item, dict) else None
    return raw if isinstance(raw, str) and _ID_RE.match(raw) else None


def _sane_instant(value: Any, label: str, now: datetime) -> datetime:
    moment = parse_instant(value) if isinstance(value, str) else None
    if moment is None:
        raise _Rejected(f"{label} must be an ISO-8601 instant")
    if moment < _MIN_AT or moment > now + _MAX_SKEW:
        raise _Rejected(f"{label} is out of range")
    return moment


def _war_key(value: Any, *, required: bool) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not WAR_KEY_RE.match(value):
        raise _Rejected("war_key must be 1-64 letters, digits, '_' or '-'")
    return value


def _event_row(item: Any, now: datetime) -> dict:
    if not isinstance(item, dict):
        raise _Rejected("event must be an object")
    if _item_id(item) is None:
        raise _Rejected("id must be 1-160 letters, digits or _ . : -")
    event_type = item.get("type")
    if event_type not in EVENT_TYPES:
        raise _Rejected(f"unknown type {str(event_type)[:40]!r}")
    state = item.get("state")
    if state is not None and not isinstance(state, dict):
        raise _Rejected("state must be an object or null")
    payload = item.get("payload", {})
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise _Rejected("payload must be an object")
    try:
        size = len(json.dumps([state, payload], allow_nan=False))
    except ValueError as e:
        raise _Rejected("event has a non-finite number") from e
    if size > MAX_EVENT_BYTES:
        raise _Rejected("event is too large")
    return {
        "id": item["id"],
        "war_key": _war_key(item.get("war_key"), required=True),
        "type": event_type,
        "at": _sane_instant(item.get("at"), "at", now),
        "state": state,
        "payload": payload,
    }


def _epoch_ms(value: Any, label: str, *, required: bool) -> datetime | None:
    if value is None and not required:
        return None
    moment = from_epoch_ms(value)
    if moment is None:
        raise _Rejected(f"{label} must be epoch milliseconds")
    return moment


def _battle_row(item: Any, now: datetime) -> dict:
    if not isinstance(item, dict):
        raise _Rejected("record must be an object")
    if _item_id(item) is None:
        raise _Rejected("id must be 1-160 letters, digits or _ . : -")
    fighters = item.get("fighters", [])
    sides = item.get("sides", [])
    if not isinstance(fighters, list) or not all(isinstance(f, dict) for f in fighters):
        raise _Rejected("fighters must be a list of objects")
    if len(fighters) > MAX_RECORD_FIGHTERS:
        raise _Rejected("too many fighters")
    if not isinstance(sides, list) or not all(isinstance(s, dict) for s in sides) or len(sides) > MAX_RECORD_SIDES:
        raise _Rejected("sides must be a short list of objects")
    ended_at = _epoch_ms(item.get("endedAt"), "endedAt", required=True)
    started_at = _epoch_ms(item.get("startedAt"), "startedAt", required=False)
    for moment in (ended_at, started_at):
        if moment is not None and (moment < _MIN_AT or moment > now + _MAX_SKEW):
            raise _Rejected("startedAt/endedAt is out of range")
    raid = item.get("raid", False)
    if not isinstance(raid, bool):
        raise _Rejected("raid must be a boolean")
    battle_id = item.get("battleId")
    try:
        record = json.loads(json.dumps(item, allow_nan=False))
    except ValueError as e:
        raise _Rejected("record has a non-finite number") from e
    return {
        "record_id": item["id"],
        "war_key": _war_key(item.get("warKey"), required=False),
        "battle_id": battle_id[:160] if isinstance(battle_id, str) else None,
        "started_at": started_at,
        "ended_at": ended_at,
        "raid": raid,
        "record": record,
    }


def _reject(rejected: list[dict], acked: list[str], item: Any, reason: str, kind: str, realm: str) -> None:
    item_id = item.get("id") if isinstance(item, dict) else None
    # Acked exactly as sent, so SF can drop the line from its outbox.
    item_id = item_id if isinstance(item_id, str) and item_id and len(item_id) <= 1024 else None
    logger.warning("Rejected war %s %r in realm %s: %s", kind, item_id, realm, reason)
    if item_id is not None and item_id not in acked:
        acked.append(item_id)
    rejected.append({"id": item_id, "reason": reason})


def ingest_events(body: Any, *, now: datetime | None = None) -> dict:
    """Store `{"realm_id", "events": [...]}`; returns `{"acked", "rejected"?}`."""
    realm, items = _items(body, "events")
    now = now or datetime.now(timezone.utc)
    acked: list[str] = []
    rejected: list[dict] = []
    rows: list[dict] = []
    seen: set[str] = set()
    for item in items:
        try:
            row = _event_row(item, now)
        except _Rejected as e:
            _reject(rejected, acked, item, str(e), "event", realm)
            continue
        if row["id"] not in seen:
            seen.add(row["id"])
            rows.append(row)
            acked.append(row["id"])

    touched: set[str] = set()
    if rows:
        with database.connect() as conn:
            for row in rows:
                inserted = conn.execute(
                    "INSERT INTO war_events (id, realm_id, war_key, type, at, state, payload) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING RETURNING id",
                    (row["id"], realm, row["war_key"], row["type"], row["at"],
                     None if row["state"] is None else database.Jsonb(row["state"]),
                     database.Jsonb(row["payload"])),
                ).fetchone()
                if inserted is not None:
                    touched.add(row["war_key"])
            for war_key in sorted(touched):
                refresh_war(conn, realm, war_key)
    return _reply(acked, rejected)


def ingest_battles(body: Any, *, now: datetime | None = None) -> dict:
    """Store `{"realm_id", "records": [...]}`; returns `{"acked", "rejected"?}`."""
    realm, items = _items(body, "records")
    now = now or datetime.now(timezone.utc)
    acked: list[str] = []
    rejected: list[dict] = []
    rows: list[dict] = []
    seen: set[str] = set()
    for item in items:
        try:
            row = _battle_row(item, now)
        except _Rejected as e:
            _reject(rejected, acked, item, str(e), "battle record", realm)
            continue
        if row["record_id"] not in seen:
            seen.add(row["record_id"])
            rows.append(row)
            acked.append(row["record_id"])

    touched: set[str] = set()
    if rows:
        with database.connect() as conn:
            for row in rows:
                inserted = conn.execute(
                    "INSERT INTO war_battles (realm_id, record_id, war_key, battle_id, started_at, ended_at, raid, record) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (realm_id, record_id) DO NOTHING "
                    "RETURNING record_id",
                    (realm, row["record_id"], row["war_key"], row["battle_id"], row["started_at"],
                     row["ended_at"], row["raid"], database.Jsonb(row["record"])),
                ).fetchone()
                if inserted is not None and row["war_key"]:
                    touched.add(row["war_key"])
            for war_key in sorted(touched):
                refresh_war(conn, realm, war_key)
    return _reply(acked, rejected)


def _reply(acked: list[str], rejected: list[dict]) -> dict:
    reply: dict[str, Any] = {"acked": acked}
    if rejected:
        reply["rejected"] = rejected
    return reply


def load_events(conn, realm: str, war_key: str) -> list[dict]:
    return conn.execute(
        "SELECT id, type, at, state, payload FROM war_events WHERE realm_id = %s AND war_key = %s "
        "ORDER BY at, received_at, id",
        (realm, war_key),
    ).fetchall()


def load_records(conn, realm: str, war_key: str) -> list[dict]:
    rows = conn.execute(
        "SELECT record FROM war_battles WHERE realm_id = %s AND war_key = %s "
        "ORDER BY ended_at NULLS LAST, record_id",
        (realm, war_key),
    ).fetchall()
    return [row["record"] for row in rows]


def refresh_war(conn, realm: str, war_key: str) -> None:
    """Recompute one war's row from all its stored events and records.

    The row lock serialises two batches for the same war: the second waits, then
    reads (read committed, a fresh snapshot per statement) what the first stored.
    """
    conn.execute(
        "INSERT INTO wars (realm_id, war_key, status) VALUES (%s, %s, 'ended') ON CONFLICT DO NOTHING",
        (realm, war_key),
    )
    conn.execute("SELECT 1 FROM wars WHERE realm_id = %s AND war_key = %s FOR UPDATE", (realm, war_key))
    model = build_war_model(war_key, load_events(conn, realm, war_key), load_records(conn, realm, war_key))
    summary = build_war_summary(model)
    conn.execute(
        "UPDATE wars SET name = %s, state = %s, status = %s, started_at = %s, ended_at = %s, result = %s, "
        "summary = %s, updated_at = now() WHERE realm_id = %s AND war_key = %s",
        (
            model["name"],
            None if model["state"] is None else database.Jsonb(model["state"]),
            model["status"],
            parse_instant(model["started_at"]),
            parse_instant(model["ended_at"]),
            None if model["result"] is None else database.Jsonb(model["result"]),
            database.Jsonb(summary),
            realm,
            war_key,
        ),
    )
