"""War notifications for the Discord bot (war history contract v1.2).

The ingest calls `write_for_event` for every newly stored war event, inside the
same transaction, so each event gives its notifications exactly once. Each row's
`payload` holds everything the bot needs to render the post. The bot polls
`pending` (staff key), posts, and acks what Discord accepted; a row handed out
but not acked within ten minutes is offered again.

Only realms in `WAR_NOTIFY_REALMS` (default `main,dev`) get rows. The bot picks
the channel for each realm. Account UUIDs from SimpleFactions' private `notify`
are turned into Discord user ids here and never leave this module otherwise.
"""

from __future__ import annotations

import logging
import os
from datetime import timedelta
from typing import Any, Callable
from urllib.parse import quote

from src import database

from .history_model import (
    SIDES,
    faction_ref,
    iso,
    other_side,
    parse_instant,
    public_payload,
    public_state,
    record_fighters,
    side_leaders,
    side_name,
    summarize,
)

logger = logging.getLogger("wars.notifications")

DEFAULT_REALMS = ("main", "dev")
SITE_DEFAULT = "https://www.tfminecraft.net"
REDELIVER_AFTER = timedelta(minutes=10)
DEFAULT_LIMIT = 50
MAX_LIMIT = 200
MAX_ACCOUNTS = 2000
TOP_FIGHTERS = 3

KINDS = (
    "war_declared",
    "ally_joined",
    "battle_day_set",
    "battle_scheduled",
    "battle_postponed",
    "battle_result",
    "war_ended",
    "defender_dm",
)

# Event type -> the channel notification it gives (war_declared also gives defender_dm rows).
_KIND_OF_EVENT = {
    "war_declared": "war_declared",
    "participant_joined": "ally_joined",
    "day_vote_closed": "battle_day_set",
    "battle_scheduled": "battle_scheduled",
    "battle_postponed": "battle_postponed",
    "battle_resolved": "battle_result",
    "war_ended": "war_ended",
}

# The same words the war pages use (frontend/lib/wars/format.ts).
GOAL_LABELS = {
    "de_jure_annex": "Annex de jure lands",
    "subjugate": "Subjugate",
    "transfer_subject": "Take a subject",
    "tributary": "Make tributary",
    "usurp": "Usurp the throne",
    "open_market": "Open the market",
    "change_government": "Change the government",
    "pillage": "Pillage",
    "overthrow": "Overthrow",
    "change_law": "Change a law",
    "change_tax": "Change a tax",
    "force_peace": "Force peace",
}
RESOLUTION_LABELS = {
    "fought": "Fought",
    "autoresolve": "Autoresolved",
    "forfeit": "Forfeit",
    "naval_default": "Naval default",
    "staff": "Staff decision",
}
KIND_LABELS = {
    "field": "Field battle",
    "siege": "Siege",
    "naval": "Naval battle",
    "naval_invasion": "Naval invasion",
    "raid": "Raid",
}
ROLE_LABELS = {
    "leader": "Leader",
    "main": "Leader",
    "subject": "Subject",
    "ally": "Ally",
    "coalition": "Coalition",
    "backer": "Backer",
}


def _words(value: str | None) -> str | None:
    if not value:
        return None
    text = value.replace("_", " ").strip()
    return text[:1].upper() + text[1:]


def goal_label(goal: str | None) -> str | None:
    return GOAL_LABELS.get(goal or "") or _words(goal)


def kind_label(kind: str | None) -> str:
    return KIND_LABELS.get(kind or "") or (f"{_words(kind)} battle" if kind else "Battle")


def reason_label(reason: str | None, winner: str | None) -> str:
    if winner == "attacker":
        return "Attacker victory"
    if winner == "defender":
        return "Defender victory"
    reason = reason or ""
    if "white" in reason:
        return "White peace"
    if "admin" in reason or "staff" in reason:
        return "Ended by staff"
    return "Ended"


# --- settings ------------------------------------------------------------------------


def notify_realms() -> set[str]:
    """`WAR_NOTIFY_REALMS`, comma separated; unset means main and dev, empty means none."""
    raw = os.environ.get("WAR_NOTIFY_REALMS")
    if raw is None:
        return set(DEFAULT_REALMS)
    return {part.strip().lower() for part in raw.split(",") if part.strip()}


def dm_realms() -> set[str]:
    """`WAR_NOTIFY_DM_REALMS`: realms whose defenders get a DM. Unset means main only, so test wars on Dev
    never message real players; empty means none."""
    raw = os.environ.get("WAR_NOTIFY_DM_REALMS")
    if raw is None:
        return {"main"}
    return {part.strip().lower() for part in raw.split(",") if part.strip()}


def site_url() -> str:
    for name in ("PUBLIC_SITE_URL", "SITE_PUBLIC_URL"):
        value = (os.environ.get(name) or "").strip().rstrip("/")
        if value:
            return value
    return SITE_DEFAULT


def _realm_map(realm: str) -> tuple[str, bool]:
    """(the map showing this realm, whether it is the site's default map)."""
    from src.api.map_registry import MapRegistryError, list_map_entries, live_map_id

    try:
        entries = [entry for entry in list_map_entries() if entry.realm_id == realm]
        live = live_map_id()
    except MapRegistryError:
        return realm, realm == "main"
    if not entries:
        return realm, realm == live
    entries.sort(key=lambda entry: (not entry.live, entry.archived))
    return entries[0].id, entries[0].id == live


def war_url(realm: str, war_key: str, record_id: str | None = None) -> str:
    """The public war page (or a battle report), with `?map=` off the site's default map."""
    map_id, default = _realm_map(realm)
    path = f"/wars/{quote(war_key, safe='')}"
    if record_id:
        path += f"/battles/{quote(record_id, safe='')}"
    if not default:
        path += f"?map={quote(map_id, safe='')}"
    return site_url() + path


# --- payloads ------------------------------------------------------------------------


def _leader(state: dict | None, side: str) -> dict:
    leaders = side_leaders(state, side)
    return {
        "name": side_name(state, side),
        "rgb": leaders[0].get("rgb") if leaders else None,
    }


def _members(state: dict | None, side: str) -> list[dict]:
    rows = (state or {}).get("sides", {}).get(side) or []
    return [
        {"name": row["name"], "role": row.get("role"), "role_label": ROLE_LABELS.get(row.get("role") or ""),
         "rgb": row.get("rgb")}
        for row in rows
    ]


def _war_name(state: dict | None, war_key: str) -> str:
    return (state or {}).get("name") or war_key


def _top_fighters(conn, realm: str, record_id: str | None) -> list[dict] | None:
    """The record's three best fighters by kills, or None when the record is not in yet."""
    if not record_id:
        return None
    row = conn.execute(
        "SELECT record FROM war_battles WHERE realm_id = %s AND record_id = %s", (realm, record_id)
    ).fetchone()
    if row is None or not isinstance(row["record"], dict):
        return None
    fighters = [f for f in record_fighters(row["record"]) if f["kills"] > 0]
    fighters.sort(key=lambda f: (-f["kills"], f["deaths"], f["name"]))
    return [
        {"name": f["name"], "side": f["side"], "faction": f["faction_name"] or None,
         "kills": f["kills"], "deaths": f["deaths"]}
        for f in fighters[:TOP_FIGHTERS]
    ]


def _regiments_by_side(rows: list[dict]) -> dict[str, int]:
    out = {side: 0 for side in SIDES}
    for row in rows:
        out[row["side"]] += row["count"]
    return out


def build_payload(
    conn,
    realm: str,
    event: dict,
    *,
    province_name: Callable[[int], str | None],
    fighter_stats_public: bool,
) -> dict:
    """The channel notification payload for one stored event (a type in `_KIND_OF_EVENT`)."""
    event_type = event["type"]
    war_key = event["war_key"]
    state = public_state(event.get("state"))
    payload = public_payload(event_type, event.get("payload"))
    base: dict[str, Any] = {
        "war_key": war_key,
        "war_name": _war_name(state, war_key),
        "at": iso(parse_instant(event.get("at"))),
        "url": war_url(realm, war_key),
    }
    if event_type == "war_declared":
        goal = (state or {}).get("goal")
        return {
            **base,
            "summary": summarize(event_type, payload, state),
            "goal": goal,
            "goal_label": goal_label(goal),
            "war_type": (state or {}).get("war_type"),
            "civil_war": bool((state or {}).get("civil_war")),
            "attacker": _leader(state, "attacker"),
            "defender": _leader(state, "defender"),
            "sides": {side: _members(state, side) for side in SIDES},
            "buildup": bool((state or {}).get("buildup")),
            "day_vote_closes_at": iso(parse_instant((state or {}).get("day_vote_closes_at"))),
        }
    summary = summarize(event_type, payload, state, names=province_name)
    if event_type == "participant_joined":
        faction = payload.get("faction") or {}
        return {
            **base,
            "summary": summary,
            "faction": faction.get("name"),
            "faction_rgb": faction.get("rgb"),
            "side": payload.get("side"),
            "side_name": side_name(state, payload["side"]) if payload.get("side") else None,
            "role": payload.get("role"),
            "role_label": ROLE_LABELS.get(payload.get("role") or ""),
        }
    if event_type == "day_vote_closed":
        return {**base, "summary": summary, "battle_day": payload["battle_day"], "quorum": payload["quorum"]}
    if event_type == "battle_scheduled":
        province_id = payload["province_id"]
        return {
            **base,
            "summary": summary,
            "scheduled_at": payload["scheduled_at"],
            "province_id": province_id,
            "province_name": province_name(province_id) if province_id is not None else None,
            "kind": payload["kind"],
            "kind_label": kind_label(payload["kind"]),
        }
    if event_type == "battle_postponed":
        return {**base, "summary": summary, "battle_day": payload["battle_day"]}
    if event_type == "battle_resolved":
        province_id = payload["province_id"]
        name = province_name(province_id) if province_id is not None else None
        battle = {**payload, "province_name": name}
        winner = payload["winner"]
        top = _top_fighters(conn, realm, payload["record_id"]) if fighter_stats_public else None
        return {
            **base,
            "summary": summarize(event_type, payload, state, battle, province_name),
            "battle_number": payload["battle_number"],
            "province_id": province_id,
            "province_name": name,
            "kind": payload["kind"],
            "kind_label": kind_label(payload["kind"]),
            "resolution": payload["resolution"],
            "resolution_label": RESOLUTION_LABELS.get(payload["resolution"], "Fought"),
            "winner": winner,
            "winner_name": side_name(state, winner) if winner else None,
            "winner_rgb": _leader(state, winner)["rgb"] if winner else None,
            "loser_name": side_name(state, other_side(winner)) if winner else None,
            "attacker": _leader(state, "attacker"),
            "defender": _leader(state, "defender"),
            "deaths": payload["deaths"],
            "regiments_lost": _regiments_by_side(payload["regiments_lost"]),
            "lives": payload["lives"],
            "top_fighters": top,
            "record_id": payload["record_id"],
            "report_url": war_url(realm, war_key, payload["record_id"]) if payload["record_id"] else None,
        }
    # war_ended
    winner = payload["winner"]
    return {
        **base,
        "summary": summary,
        "reason": payload["reason"],
        "reason_label": reason_label(payload["reason"], winner),
        "winner": winner,
        "winner_name": side_name(state, winner) if winner else None,
        "winner_rgb": _leader(state, winner)["rgb"] if winner else None,
        "truce_until": payload["truce_until"],
    }


def defender_accounts(notify: Any) -> list[str]:
    """The account UUIDs of SimpleFactions' private `notify.defender_accounts`, lower case."""
    raw = notify.get("defender_accounts") if isinstance(notify, dict) else None
    if not isinstance(raw, list):
        return []
    out = []
    for value in raw[:MAX_ACCOUNTS]:
        if isinstance(value, str) and 0 < len(value.strip()) <= 64:
            out.append(value.strip().lower())
    return list(dict.fromkeys(out))


def _linked_discord_users(conn, accounts: list[str]) -> list[str]:
    """Discord user ids linked to these accounts and still in the guild."""
    if not accounts:
        return []
    rows = conn.execute(
        "SELECT DISTINCT discord_user_id FROM discord_links "
        "WHERE lower(player_uuid) = ANY(%s) AND left_guild_at IS NULL ORDER BY discord_user_id",
        (accounts,),
    ).fetchall()
    return [row["discord_user_id"] for row in rows]


def _insert(conn, realm: str, event: dict, kind: str, payload: dict) -> bool:
    row = conn.execute(
        "INSERT INTO war_notifications (realm_id, war_key, event_id, kind, payload) VALUES (%s, %s, %s, %s, %s) "
        "ON CONFLICT DO NOTHING RETURNING id",
        (realm, event["war_key"], event["id"], kind, database.Jsonb(payload)),
    ).fetchone()
    return row is not None


def write_for_event(conn, realm: str, event: dict, notify: Any = None) -> int:
    """Queue the notifications of one newly stored event; returns how many rows were written.

    Runs in a savepoint, so a failure here is logged and leaves the event stored:
    a war page matters more than its Discord post.
    """
    if realm not in notify_realms() or event.get("type") not in _KIND_OF_EVENT:
        return 0
    from .history_reads import fighter_stats_public, province_names

    try:
        with conn.transaction():
            map_id, _ = _realm_map(realm)
            payload = build_payload(
                conn, realm, event,
                province_name=province_names(map_id),
                fighter_stats_public=fighter_stats_public(),
            )
            written = 0
            if _insert(conn, realm, event, _KIND_OF_EVENT[event["type"]], payload):
                written += 1
            if event["type"] == "war_declared" and realm in dm_realms():
                for user_id in _linked_discord_users(conn, defender_accounts(notify)):
                    dm = {
                        "discord_user_id": user_id,
                        "war_key": payload["war_key"],
                        "war_name": payload["war_name"],
                        "attacker_name": payload["attacker"]["name"],
                        "defender_name": payload["defender"]["name"],
                        "goal_label": payload["goal_label"],
                        "day_vote_closes_at": payload["day_vote_closes_at"],
                        "url": payload["url"],
                    }
                    if _insert(conn, realm, event, "defender_dm", dm):
                        written += 1
            return written
    except Exception:  # noqa: BLE001 - never lose the event over its notification
        logger.exception("Could not queue war notifications for event %s in realm %s", event.get("id"), realm)
        return 0


# --- the bot's poll --------------------------------------------------------------------


def _row(row: dict) -> dict:
    return {
        "id": row["id"],
        "realm_id": row["realm_id"],
        "war_key": row["war_key"],
        "event_id": row["event_id"],
        "kind": row["kind"],
        "created_at": iso(row["created_at"]),
        "payload": row["payload"],
    }


def pending(limit: int | None = None, realms: list[str] | None = None) -> list[dict]:
    """Undelivered rows, oldest first, stamped as dispatched. Handed-out rows return after ten minutes."""
    limit = max(1, min(MAX_LIMIT, DEFAULT_LIMIT if limit is None else int(limit)))
    wanted = sorted({r.strip().lower() for r in realms or [] if r and r.strip()}) or None
    with database.connect() as conn:
        rows = conn.execute(
            "WITH picked AS ("
            " SELECT id FROM war_notifications"
            " WHERE acked_at IS NULL AND (dispatched_at IS NULL OR dispatched_at <= now() - %s)"
            " AND (%s::text[] IS NULL OR realm_id = ANY(%s::text[]))"
            " ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED)"
            " UPDATE war_notifications n SET dispatched_at = now() FROM picked WHERE n.id = picked.id"
            " RETURNING n.*",
            (REDELIVER_AFTER, wanted, wanted, limit),
        ).fetchall()
    return [_row(row) for row in sorted(rows, key=lambda row: row["id"])]


def ack(ids: list[int]) -> list[int]:
    """Stamp `acked_at`; returns every given id that exists (acked now or before)."""
    wanted = sorted({int(i) for i in ids})
    if not wanted:
        return []
    with database.connect() as conn:
        conn.execute(
            "UPDATE war_notifications SET acked_at = now() WHERE id = ANY(%s) AND acked_at IS NULL", (wanted,)
        )
        rows = conn.execute("SELECT id FROM war_notifications WHERE id = ANY(%s) ORDER BY id", (wanted,)).fetchall()
    return [row["id"] for row in rows]
