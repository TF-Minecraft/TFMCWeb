"""War notifications for the Discord bot (war history contract v1.2).

The ingest calls `write_for_event` for every newly stored war event, inside the
same transaction, so each event gives its notifications exactly once. Each row's
`payload` holds everything the bot needs to render the post. The bot polls
`pending` (staff key), posts, and acks what Discord accepted; a row handed out
but not acked within ten minutes is offered again.

Only realms in `WAR_NOTIFY_REALMS` (default `main,dev`) get rows. The bot picks
the channel for each realm. Account UUIDs from SimpleFactions' private `notify`
are turned into Discord user ids here and never leave this module otherwise.

Contract v1.4: `battle_day_locked` gives a thread post, and `vote_reminder` gives
`vote_reminder_dm` rows: at most one per Discord user per war per UTC day, none
for a user who muted the war (`war_dm_mutes`, set by the bot's Mute button).
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
    format_day_label,
    iso,
    other_side,
    parse_instant,
    place_from_battle_name,
    public_payload,
    public_state,
    record_fighters,
    side_leaders,
    side_name,
    side_of,
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
    # Contract v1.3: a call to arms, sent to the called faction's leader with Accept and Decline.
    "call_to_arms_dm",
    # Contract v1.4: a date became a battle day (thread post), and availability reminders (DMs).
    "battle_day_locked",
    "vote_reminder_dm",
)

REMINDER_REASONS = ("mark_availability", "battle_day_locked", "time_lock_soon")
# The war page's vote panel.
VOTE_ANCHOR = "#vote"

# Event type -> the channel notification it gives (war_declared also gives defender_dm rows).
_KIND_OF_EVENT = {
    "war_declared": "war_declared",
    "participant_joined": "ally_joined",
    "day_vote_closed": "battle_day_set",
    "battle_scheduled": "battle_scheduled",
    "battle_postponed": "battle_postponed",
    "battle_resolved": "battle_result",
    "war_ended": "war_ended",
    "battle_day_locked": "battle_day_locked",
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


def vote_url(realm: str, war_key: str) -> str:
    """The war page's vote panel (`#vote`)."""
    return war_url(realm, war_key) + VOTE_ANCHOR


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


def _record(conn, realm: str, record_id: str | None) -> dict | None:
    """The stored battle record, or None when there is none or it is not in yet."""
    if not record_id:
        return None
    row = conn.execute(
        "SELECT record FROM war_battles WHERE realm_id = %s AND record_id = %s", (realm, record_id)
    ).fetchone()
    return row["record"] if row is not None and isinstance(row["record"], dict) else None


def _top_fighters(record: dict | None) -> list[dict] | None:
    """The record's three best fighters by kills, or None when the record is not in yet."""
    if record is None:
        return None
    fighters = [f for f in record_fighters(record) if f["kills"] > 0]
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
    if event_type == "battle_day_locked":
        return {
            **base,
            "summary": summary,
            "battle_day": payload["battle_day"],
            "battle_day_label": format_day_label(payload["battle_day"]),
            "time_locks_at": payload["time_locks_at"],
            "forced": payload["forced"],
            "vote_url": vote_url(realm, war_key),
        }
    if event_type == "battle_resolved":
        province_id = payload["province_id"]
        record = _record(conn, realm, payload["record_id"])
        name = province_name(province_id) if province_id is not None else None
        # Provinces with no settlement or installation have no map name; the battle record still names the place.
        name = name or place_from_battle_name(record.get("name") if record else None)
        battle = {**payload, "province_name": name}
        winner = payload["winner"]
        top = _top_fighters(record) if fighter_stats_public else None
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


def call_to_arms_leader(private: Any) -> str | None:
    """The leader account of a `call_to_arms_sent` event's private `notify`, lower case."""
    notify = private.get("notify") if isinstance(private, dict) else None
    raw = notify.get("leader_account") if isinstance(notify, dict) else None
    if isinstance(raw, str) and 0 < len(raw.strip()) <= 64:
        return raw.strip().lower()
    return None


def call_to_arms_payload(realm: str, event: dict, discord_user_id: str) -> dict | None:
    """The `call_to_arms_dm` payload for one `call_to_arms_sent` event, or None when it names no target."""
    p = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    caller = faction_ref(p.get("caller"))
    target = faction_ref(p.get("target"))
    if target is None or not target.get("id"):
        return None
    state = public_state(event.get("state"))
    war_key = event["war_key"]
    side = side_of(p.get("side"))
    return {
        "discord_user_id": discord_user_id,
        "war_key": war_key,
        "war_name": _war_name(state, war_key),
        "at": iso(parse_instant(event.get("at"))),
        "caller_name": (caller or {}).get("name"),
        "caller_rgb": (caller or {}).get("rgb"),
        "target_faction_id": target["id"],
        "target_name": target.get("name"),
        "side": side,
        "enemy_name": side_name(state, other_side(side)) if side else None,
        "coalition": p.get("coalition") is True,
        "url": war_url(realm, war_key),
    }


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


def reminder_accounts(event: dict) -> list[str]:
    """The account UUIDs of a `vote_reminder` event's private `notify.accounts` (or a top-level
    `notify.accounts`), lower case, each once."""
    for holder in (event.get("private"), event):
        notify = holder.get("notify") if isinstance(holder, dict) else None
        raw = notify.get("accounts") if isinstance(notify, dict) else None
        if isinstance(raw, list):
            out = [v.strip().lower() for v in raw[:MAX_ACCOUNTS] if isinstance(v, str) and 0 < len(v.strip()) <= 64]
            return list(dict.fromkeys(out))
    return []


def reminder_payload(realm: str, event: dict, discord_user_id: str) -> dict | None:
    """The `vote_reminder_dm` payload for one `vote_reminder` event, or None for an unknown reason."""
    p = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    reason = p.get("reason")
    if reason not in REMINDER_REASONS:
        return None
    state = public_state(event.get("state"))
    war_key = event["war_key"]
    battle_day = p.get("battle_day") if isinstance(p.get("battle_day"), str) else None
    label = format_day_label(battle_day)
    return {
        "discord_user_id": discord_user_id,
        "realm": realm,
        "war_key": war_key,
        "war_name": _war_name(state, war_key),
        "at": iso(parse_instant(event.get("at"))),
        "reason": reason,
        "battle_day": battle_day if label else None,
        "battle_day_label": label,
        "locks_at": iso(parse_instant(p.get("locks_at"))),
        "url": war_url(realm, war_key),
        "vote_url": vote_url(realm, war_key),
    }


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
    if realm not in notify_realms():
        return 0
    if event.get("type") == "call_to_arms_sent":
        return _write_call_to_arms(conn, realm, event)
    if event.get("type") == "vote_reminder":
        return _write_vote_reminders(conn, realm, event)
    if event.get("type") not in _KIND_OF_EVENT:
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


def _write_call_to_arms(conn, realm: str, event: dict) -> int:
    """One `call_to_arms_dm` for the called faction's leader, when linked; only in DM realms."""
    if realm not in dm_realms():
        return 0
    try:
        with conn.transaction():
            leader = call_to_arms_leader(event.get("private"))
            users = _linked_discord_users(conn, [leader]) if leader else []
            if not users:
                return 0
            payload = call_to_arms_payload(realm, event, users[0])
            if payload is None:
                return 0
            return 1 if _insert(conn, realm, event, "call_to_arms_dm", payload) else 0
    except Exception:  # noqa: BLE001 - never lose the event over its notification
        logger.exception("Could not queue the call to arms DM for event %s in realm %s", event.get("id"), realm)
        return 0


def _write_vote_reminders(conn, realm: str, event: dict) -> int:
    """One `vote_reminder_dm` per linked Discord user of the reminded accounts; only in DM realms,
    at most one per user per war per UTC day, none for a user who muted the war."""
    if realm not in dm_realms():
        return 0
    try:
        with conn.transaction():
            users = _linked_discord_users(conn, reminder_accounts(event))
            if not users:
                return 0
            war_key = event["war_key"]
            # Two batches of the same war wait for each other, so a user is never reminded twice in a day.
            conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                         (f"war_reminders:{realm}:{war_key}",))
            skip = {
                row["discord_user_id"] for row in conn.execute(
                    "SELECT discord_user_id FROM war_dm_mutes WHERE realm_id = %s AND war_key = %s "
                    "UNION SELECT payload ->> 'discord_user_id' FROM war_notifications "
                    "WHERE realm_id = %s AND war_key = %s AND kind = 'vote_reminder_dm' "
                    "AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
                    (realm, war_key, realm, war_key),
                ).fetchall()
            }
            written = 0
            for user_id in users:
                if user_id in skip:
                    continue
                payload = reminder_payload(realm, event, user_id)
                if payload is None:
                    return 0
                if _insert(conn, realm, event, "vote_reminder_dm", payload):
                    written += 1
            return written
    except Exception:  # noqa: BLE001 - never lose the event over its notification
        logger.exception("Could not queue vote reminder DMs for event %s in realm %s", event.get("id"), realm)
        return 0


# --- mutes (the bot's Mute this war button) ---------------------------------------------


def mute(realm: str, war_key: str, discord_user_id: str) -> bool:
    """Stop availability reminder DMs of one war for one Discord user; True when newly muted."""
    with database.connect() as conn:
        row = conn.execute(
            "INSERT INTO war_dm_mutes (realm_id, war_key, discord_user_id) VALUES (%s, %s, %s) "
            "ON CONFLICT DO NOTHING RETURNING created_at",
            (realm, war_key, discord_user_id),
        ).fetchone()
    return row is not None


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


def outbox_id() -> str:
    """This database's outbox identity (a UUID made by the migration).

    The bot keys what it delivered by it, so a reset database, whose row ids start at 1
    again, is a new outbox and its rows are not taken for ones already posted. Made again
    if the row was deleted.
    """
    with database.connect() as conn:
        row = conn.execute("SELECT outbox_id FROM war_notification_outbox WHERE id = 1").fetchone()
        if row is None:
            row = conn.execute(
                "INSERT INTO war_notification_outbox (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET id = 1 "
                "RETURNING outbox_id"
            ).fetchone()
    return str(row["outbox_id"])


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
