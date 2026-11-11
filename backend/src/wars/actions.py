"""War actions (contract addendum v1.3): votes and call to arms answers made outside the game.

Contract v1.4 adds battle availability: `private.voting` of kind `availability` is a
grid of dates and start hours, and the action kind `availability` replaces one
account's marks on one date (`{"date", "hours"}`) or answers "none of these days
work" (`{"none": true}`). The day and hour votes of v1.3 keep working until every
server runs the new plugin; `voting.kind` says which one a war uses.

A signed-in player votes on the war page, or a faction leader answers a call to
arms from a Discord DM. Each action is queued in `war_actions` for the account
it is made for; SimpleFactions polls the queue, applies each action with the
in-game rules and reports `applied` or `rejected` with a player-facing reason.
Rows still pending ten minutes after creation expire.

The website refuses up front only what PS's latest private state already shows
(a closed vote, an account that is not eligible, no open call); the plugin is the
authority and checks everything again.

Private: `private.voting` (eligible accounts, every account's votes, the tally),
`private.notify` and account UUIDs stay in this module. `me` returns one account's
own picks and, to eligible accounts only, the tally.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from src import database

from .history_model import SIDES, battle_day_hour, faction_ref, iso, parse_instant, side_of

KINDS = ("call_to_arms_answer", "day_vote", "hour_vote", "availability")
VOTE_KINDS = {"day": "day_vote", "hour": "hour_vote"}
AVAILABILITY = "availability"
DATE_STATES = ("open", "battle", "no_battle")
SOURCES = ("web", "discord")
RESULT_STATUSES = ("applied", "rejected")

EXPIRE_AFTER = timedelta(minutes=10)
# A row handed to the plugin is offered again only this long after, so one poll's
# actions are not handed out again while the server is still applying them.
REDELIVER_AFTER = timedelta(seconds=30)
DEFAULT_LIMIT = 50
MAX_LIMIT = 200
MAX_RESULTS = 500
MAX_REASON = 500
MAX_OPTIONS = 64
MAX_DATES = 31
MAX_HOURS = 24
# Per account, across wars: enough for anyone changing their mind, not for a script.
RATE_LIMIT = 30
RATE_WINDOW = timedelta(minutes=10)

EXPIRED_REASON = "The server did not answer in time. Try again."
REPLACED_REASON = "Replaced by a newer vote."
NO_CALL_REASON = "Your faction has no call to arms in that war."
CLOSED_REASON = "This vote is closed."
NOT_ELIGIBLE_REASON = "Only members of the warring factions and their hired mercenaries vote."
DAY_DECIDED_REASON = "That day is already decided. You can't change it now."
NOT_SHOWN_REASON = "That day is not open for marking."
BAD_HOURS_REASON = "Pick from the start times shown."

_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_FACTION_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")


class WarActionError(ValueError):
    """A refused action: `status` is the HTTP status, the message is shown to the player."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def account_key(value: Any) -> str | None:
    """An account UUID as stored: lower case, trimmed; None when unusable."""
    if not isinstance(value, str):
        return None
    text = value.strip().lower()
    return text if 0 < len(text) <= 64 else None


def _bare(value: str) -> str:
    return value.replace("-", "")


# --- the private vote ---------------------------------------------------------------


def _option(kind: str, value: Any) -> Any:
    """A valid option of this vote kind, normalised, or None."""
    if kind == "day":
        return value if isinstance(value, str) and _DAY_RE.match(value) else None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def voting_view(raw: Any) -> dict | None:
    """SimpleFactions' `private.voting`, cleaned; None when it is unusable.

    `kind` is None when no vote is open. Accounts are keyed without dashes, so a
    dashed and an undashed UUID match.
    """
    if not isinstance(raw, dict):
        return None
    if raw.get("kind") == AVAILABILITY:
        return availability_view(raw)
    kind = raw.get("kind") if raw.get("kind") in VOTE_KINDS else None
    options: list = []
    labels: list[str] = []
    if kind is not None:
        raw_options = raw.get("options") if isinstance(raw.get("options"), list) else []
        raw_labels = raw.get("option_labels") if isinstance(raw.get("option_labels"), list) else []
        for index, value in enumerate(raw_options[:MAX_OPTIONS]):
            option = _option(kind, value)
            if option is None or option in options:
                continue
            label = raw_labels[index] if index < len(raw_labels) else None
            options.append(option)
            labels.append(label[:80] if isinstance(label, str) and label else str(option))
    eligible = _eligible(raw)
    votes: dict[str, list] = {}
    raw_votes = raw.get("votes") if isinstance(raw.get("votes"), dict) else {}
    for account, picks in raw_votes.items():
        key = account_key(account)
        if key and isinstance(picks, list) and kind is not None:
            votes[_bare(key)] = [p for p in (_option(kind, v) for v in picks[:MAX_OPTIONS]) if p is not None]
    tally = []
    if kind is not None:
        counts = {}
        for row in raw.get("tally") if isinstance(raw.get("tally"), list) else []:
            if not isinstance(row, dict):
                continue
            option = _option(kind, row.get("option"))
            if option is not None:
                counts[option] = {side: _count(row.get(side)) for side in SIDES}
        tally = [{"option": option, **counts.get(option, {"attacker": 0, "defender": 0})} for option in options]
    return {
        "kind": kind,
        "options": options,
        "option_labels": labels,
        "closes_at": iso(parse_instant(raw.get("closes_at"))),
        "eligible": eligible,
        "votes": votes,
        "tally": tally,
    }


def _eligible(raw: dict) -> dict[str, str]:
    eligible: dict[str, str] = {}
    raw_eligible = raw.get("eligible") if isinstance(raw.get("eligible"), dict) else {}
    for account, side in raw_eligible.items():
        key = account_key(account)
        side = side_of(side)
        if key and side:
            eligible[_bare(key)] = side
    return eligible


def _day(value: Any) -> str | None:
    return value if isinstance(value, str) and _DAY_RE.match(value) else None


def _hours(values: Any, offered: list[int]) -> list[int]:
    """The offered hours among `values`, in offered order."""
    wanted = {battle_day_hour(v) for v in values[:MAX_HOURS * 2]} if isinstance(values, list) else set()
    return [hour for hour in offered if hour in wanted]


def availability_view(raw: dict) -> dict:
    """`private.voting` of kind `availability` (contract v1.4), cleaned.

    Accounts are keyed without dashes. `marks` keeps only shown dates and offered hours.
    """
    hours: list[int] = []
    labels: list[str] = []
    raw_hours = raw.get("hours") if isinstance(raw.get("hours"), list) else []
    raw_labels = raw.get("hour_labels") if isinstance(raw.get("hour_labels"), list) else []
    for index, value in enumerate(raw_hours[:MAX_HOURS]):
        hour = battle_day_hour(value)
        if hour is None or hour in hours:
            continue
        label = raw_labels[index] if index < len(raw_labels) else None
        hours.append(hour)
        labels.append(label[:40] if isinstance(label, str) and label else f"{hour % 24:02d}:00 CET")
    dates: list[dict] = []
    for row in raw.get("dates")[:MAX_DATES] if isinstance(raw.get("dates"), list) else []:
        day = _day(row.get("date")) if isinstance(row, dict) else None
        if day is None or any(d["date"] == day for d in dates):
            continue
        state = row.get("state") if row.get("state") in DATE_STATES else "open"
        hour = battle_day_hour(row.get("hour"))
        label = row.get("label")
        dates.append({
            "date": day,
            "label": label[:40] if isinstance(label, str) and label else day,
            "state": state,
            "day_locks_at": iso(parse_instant(row.get("day_locks_at"))),
            "time_locks_at": iso(parse_instant(row.get("time_locks_at"))),
            "hour": hour if hour in hours else None,
            "editable": row.get("editable") is True and state != "no_battle",
            "forced": row.get("forced") is True,
        })
    shown = {d["date"] for d in dates}
    marks: dict[str, dict[str, list[int]]] = {}
    raw_marks = raw.get("marks") if isinstance(raw.get("marks"), dict) else {}
    for account, by_date in raw_marks.items():
        key = account_key(account)
        if not key or not isinstance(by_date, dict):
            continue
        own = {day: _hours(values, hours) for day, values in by_date.items() if day in shown}
        own = {day: values for day, values in own.items() if values}
        if own:
            marks[_bare(key)] = own
    none = []
    for account in raw.get("none") if isinstance(raw.get("none"), list) else []:
        key = account_key(account)
        if key and _bare(key) not in none:
            none.append(_bare(key))
    counts: dict[tuple[str, int], dict] = {}
    for row in raw.get("tally") if isinstance(raw.get("tally"), list) else []:
        if not isinstance(row, dict):
            continue
        day, hour = _day(row.get("date")), battle_day_hour(row.get("hour"))
        if day in shown and hour in hours:
            counts[(day, hour)] = {side: _count(row.get(side)) for side in SIDES}
    tally = [
        {"date": d["date"], "hour": hour, **counts.get((d["date"], hour), {"attacker": 0, "defender": 0})}
        for d in dates for hour in hours
    ]
    raw_need = raw.get("need") if isinstance(raw.get("need"), dict) else {}
    return {
        "kind": AVAILABILITY,
        "hours": hours,
        "hour_labels": labels,
        "dates": dates,
        "closes_at": iso(parse_instant(raw.get("closes_at"))),
        "need": {side: max(1, _count(raw_need.get(side))) for side in SIDES},
        "eligible": _eligible(raw),
        "marks": marks,
        "none": none,
        "tally": tally,
    }


def date_is_editable(row: dict, now: datetime | None = None) -> bool:
    """Whether marks on this date may still change, as the latest private state shows it.

    The plugin refuses a change once the time is locked, and on a date still `open` once
    its day lock has passed (the day is being decided), even before its next event says so.
    """
    if not row["editable"]:
        return False
    now = now or _now()
    locks = [row["time_locks_at"]] + ([row["day_locks_at"]] if row["state"] == "open" else [])
    return all((at := parse_instant(value)) is None or at > now for value in locks)


def _count(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return max(0, int(value))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def vote_is_open(voting: dict | None, now: datetime | None = None) -> bool:
    if voting and voting["kind"] == AVAILABILITY:
        # The grid stays on the page while it shows dates; each date has its own locks.
        return bool(voting["dates"] and voting["hours"])
    if not voting or voting["kind"] is None or not voting["options"]:
        return False
    closes = parse_instant(voting["closes_at"])
    return closes is None or closes > (now or _now())


# --- reading one war ------------------------------------------------------------------


def _war(conn, realm: str, war_key: str) -> dict | None:
    return conn.execute(
        "SELECT status, private FROM wars WHERE realm_id = %s AND war_key = %s", (realm, war_key)
    ).fetchone()


def _war_voting(war: dict | None) -> tuple[dict | None, datetime | None]:
    """(the war's latest private vote, when PS received it); no vote once the war has ended."""
    if war is None or war["status"] != "active" or not isinstance(war["private"], dict):
        return None, None
    return voting_view(war["private"].get("voting")), parse_instant(war["private"].get("received_at"))


def open_calls(conn, realm: str, war_key: str) -> dict[str, dict]:
    """Open calls to arms of a war, by lower-case target faction id.

    A call opens with `call_to_arms_sent` and closes with `call_to_arms_closed`,
    the target's `participant_joined`, or the end of the war.
    """
    rows = conn.execute(
        "SELECT type, payload, private, received_at FROM war_events WHERE realm_id = %s AND war_key = %s "
        "AND type IN ('call_to_arms_sent', 'call_to_arms_closed', 'participant_joined', 'war_ended') "
        "ORDER BY at, received_at, id",
        (realm, war_key),
    ).fetchall()
    calls: dict[str, dict] = {}
    for row in rows:
        payload = row["payload"] if isinstance(row["payload"], dict) else {}
        if row["type"] == "war_ended":
            calls.clear()
            continue
        target = faction_ref(payload.get("faction" if row["type"] == "participant_joined" else "target"))
        if target is None or not target.get("id"):
            continue
        key = target["id"].lower()
        if row["type"] != "call_to_arms_sent":
            calls.pop(key, None)
            continue
        private = row["private"] if isinstance(row["private"], dict) else {}
        notify = private.get("notify") if isinstance(private.get("notify"), dict) else {}
        calls[key] = {
            "caller": faction_ref(payload.get("caller")),
            "target": target,
            "side": side_of(payload.get("side")),
            "coalition": payload.get("coalition") is True,
            "received_at": row["received_at"],
            "leader_account": account_key(notify.get("leader_account")),
        }
    return calls


def _action(row: dict | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "kind": row["kind"],
        "status": row["status"],
        "reason": row["reason"],
        "retry": bool(row.get("retry")),
        "source": row["source"],
        "payload": row["payload"],
        "created_at": iso(row["created_at"]),
        "applied_at": iso(row["applied_at"]),
    }


def _expire_stale(conn) -> None:
    conn.execute(
        "UPDATE war_actions SET status = 'expired', reason = %s, retry = true "
        "WHERE status = 'pending' AND created_at <= now() - %s",
        (EXPIRED_REASON, EXPIRE_AFTER),
    )


def _latest_actions(conn, realm: str, war_key: str, account: str) -> dict[str, dict]:
    rows = conn.execute(
        "SELECT DISTINCT ON (kind) * FROM war_actions WHERE realm_id = %s AND war_key = %s AND account_uuid = %s "
        "ORDER BY kind, id DESC",
        (realm, war_key, account),
    ).fetchall()
    return {row["kind"]: row for row in rows}


def _availability_actions(conn, realm: str, war_key: str, account: str) -> tuple[list[dict], list[dict]]:
    """The account's availability actions, oldest first: the latest per date (and the latest "none"
    answer), for their status; and the latest applied per date, for the marks.

    A newer change still pending, or refused, must not hide the change the server applied before it.
    """
    rows = conn.execute(
        "SELECT DISTINCT ON (COALESCE(payload ->> 'date', ''), status = 'applied') * FROM war_actions "
        "WHERE realm_id = %s AND war_key = %s AND account_uuid = %s AND kind = 'availability' "
        "ORDER BY COALESCE(payload ->> 'date', ''), status = 'applied', id DESC",
        (realm, war_key, account),
    ).fetchall()
    latest: dict[str, dict] = {}
    for row in rows:
        key = (row["payload"] or {}).get("date") or ""
        if key not in latest or row["id"] > latest[key]["id"]:
            latest[key] = row
    applied = [row for row in rows if row["status"] == "applied"]
    return sorted(latest.values(), key=lambda row: row["id"]), sorted(applied, key=lambda row: row["id"])


def _call_answers(conn, realm: str, war_key: str, account: str) -> dict[str, dict]:
    """The account's latest call to arms answer per lower-case target faction id."""
    rows = conn.execute(
        "SELECT DISTINCT ON (lower(payload ->> 'target_faction_id')) * FROM war_actions "
        "WHERE realm_id = %s AND war_key = %s AND account_uuid = %s AND kind = 'call_to_arms_answer' "
        "ORDER BY lower(payload ->> 'target_faction_id'), id DESC",
        (realm, war_key, account),
    ).fetchall()
    return {str(row["payload"].get("target_faction_id") or "").lower(): row for row in rows}


def _availability_reply(voting: dict, account: str, rows: list[dict], voting_received: datetime | None) -> dict:
    """The grid for one eligible account: dates, hours, need, its own marks and "none" answer, the tally.

    An action applied after the latest private state was received wins, so "Saved" never
    shows next to the old marks while the plugin's next event is on its way. A "none"
    answer clears the account's marks on the dates it can still change.
    """
    now = _now()
    dates = [{**row, "editable": date_is_editable(row, now)} for row in voting["dates"]]
    marks = {day: list(hours) for day, hours in voting["marks"].get(_bare(account), {}).items()}
    none = _bare(account) in voting["none"]
    for row in rows:
        if row["status"] != "applied" or row["applied_at"] is None:
            continue
        if voting_received is not None and row["applied_at"] <= voting_received:
            continue
        payload = row["payload"] or {}
        if payload.get("none") is True:
            none = True
            for d in dates:
                if d["editable"]:
                    marks.pop(d["date"], None)
        elif isinstance(payload.get("date"), str):
            hours = _hours(payload.get("hours"), voting["hours"])
            if hours:
                marks[payload["date"]] = hours
                none = False
            else:
                marks.pop(payload["date"], None)
    shown = [d["date"] for d in dates]
    return {
        "vote": {
            "kind": AVAILABILITY,
            "hours": voting["hours"],
            "hour_labels": voting["hour_labels"],
            "dates": dates,
            "closes_at": voting["closes_at"],
            "need": voting["need"],
        },
        "marks": {day: marks[day] for day in shown if marks.get(day)},
        "none": none,
        "tally": voting["tally"],
    }


def _public_vote(voting: dict | None) -> dict | None:
    if not vote_is_open(voting):
        return None
    return {"kind": voting["kind"], "closes_at": voting["closes_at"]}


def me(realm: str, war_key: str, account: str | None, *, signed_in: bool) -> dict | None:
    """What the war page shows one user: their side, the open vote, their picks and actions.

    `account` is the linked Minecraft account (None when signed out or not linked).
    None when the war is unknown.
    """
    with database.connect() as conn:
        war = _war(conn, realm, war_key)
        if war is None:
            return None
        voting, voting_received = _war_voting(war)
        reply: dict[str, Any] = {
            "signed_in": signed_in,
            "linked": account is not None,
            "eligible": False,
            "side": None,
            "vote": _public_vote(voting),
            "picks": None,
            "marks": None,
            "none": None,
            "tally": None,
            "actions": {kind: None for kind in KINDS},
            "availability_actions": [],
            "calls_to_arms": [],
        }
        if account is None:
            return reply
        _expire_stale(conn)
        latest = _latest_actions(conn, realm, war_key, account)
        reply["actions"] = {kind: _action(latest.get(kind)) for kind in KINDS}
        availability_rows, applied_rows = _availability_actions(conn, realm, war_key, account)
        if voting is not None and voting["kind"] == AVAILABILITY:
            shown = {d["date"] for d in voting["dates"]}
            reply["availability_actions"] = [
                _action(row) for row in availability_rows
                if row["payload"].get("none") is True or row["payload"].get("date") in shown
            ]
        side = (voting or {}).get("eligible", {}).get(_bare(account))
        if side is not None:
            reply["eligible"] = True
            reply["side"] = side
            if vote_is_open(voting) and voting["kind"] == AVAILABILITY:
                reply.update(_availability_reply(voting, account, applied_rows, voting_received))
            elif vote_is_open(voting):
                reply["vote"] = {
                    key: voting[key] for key in ("kind", "options", "option_labels", "closes_at")
                }
                reply["picks"] = _picks(voting, account, latest.get(VOTE_KINDS[voting["kind"]]), voting_received)
                reply["tally"] = voting["tally"]
        if war["status"] == "active":
            answers = _call_answers(conn, realm, war_key, account)
            for key, call in open_calls(conn, realm, war_key).items():
                if call["leader_account"] is None or _bare(call["leader_account"]) != _bare(account):
                    continue
                answer = answers.get(key)
                # An answer from before this call was sent belongs to an earlier call.
                if answer is not None and answer["created_at"] < call["received_at"]:
                    answer = None
                reply["calls_to_arms"].append({
                    "caller": call["caller"],
                    "target": call["target"],
                    "side": call["side"],
                    "coalition": call["coalition"],
                    "action": _action(answer),
                })
    return reply


def _picks(voting: dict, account: str, action: dict | None, voting_received: datetime | None) -> list:
    """The account's saved picks; an action applied after the latest private state was received wins,
    so "Saved" never shows next to the old picks while the plugin's next event is on its way."""
    picks = voting["votes"].get(_bare(account), [])
    if (
        action is not None
        and action["status"] == "applied"
        and action["applied_at"] is not None
        and (voting_received is None or action["applied_at"] > voting_received)
    ):
        wanted = (action["payload"] or {}).get("picks")
        if isinstance(wanted, list):
            picks = [option for option in voting["options"] if option in wanted]
    return picks


# --- queueing --------------------------------------------------------------------------


def _check_rate(conn, account: str) -> None:
    count = conn.execute(
        "SELECT count(*) AS n FROM war_actions WHERE account_uuid = %s AND created_at > now() - %s",
        (account, RATE_WINDOW),
    ).fetchone()["n"]
    if count >= RATE_LIMIT:
        raise WarActionError(429, "Too many changes in a short time. Wait a few minutes and try again.")


def _insert(conn, realm: str, war_key: str, kind: str, account: str, payload: dict, *,
            source: str, discord_user_id: str | None) -> dict:
    return conn.execute(
        "INSERT INTO war_actions (realm_id, war_key, kind, account_uuid, discord_user_id, source, payload) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
        (realm, war_key, kind, account, discord_user_id, source, database.Jsonb(payload)),
    ).fetchone()


def clean_picks(kind: str, picks: Any, options: list) -> list:
    """The picks as a set of this vote's options, in option order; WarActionError when one is not an option."""
    if not isinstance(picks, list) or len(picks) > MAX_OPTIONS:
        raise WarActionError(400, "Pick from the options of the vote.")
    wanted = []
    for value in picks:
        option = _option(kind, value)
        if option is None or option not in options:
            raise WarActionError(400, "Pick from the options of the vote.")
        wanted.append(option)
    return [option for option in options if option in wanted]


def queue_vote(realm: str, war_key: str, account: str, kind: str, picks: Any, *,
               discord_user_id: str | None = None) -> dict:
    """Queue a web vote. Replaces the account's still-pending vote of the same war and kind."""
    if kind not in VOTE_KINDS:
        raise WarActionError(400, "kind must be day or hour.")
    with database.transaction() as conn:
        war = _war(conn, realm, war_key)
        if war is None:
            raise WarActionError(404, "War not found")
        voting, _ = _war_voting(war)
        if not vote_is_open(voting) or voting["kind"] != kind:
            raise WarActionError(409, CLOSED_REASON)
        if _bare(account) not in voting["eligible"]:
            raise WarActionError(403, NOT_ELIGIBLE_REASON)
        wanted = clean_picks(kind, picks, voting["options"])
        action_kind = VOTE_KINDS[kind]
        # One account's votes queue one after another, so a replaced row is never left pending.
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (f"war_actions:{account}",))
        _check_rate(conn, account)
        conn.execute(
            "UPDATE war_actions SET status = 'expired', reason = %s WHERE realm_id = %s AND war_key = %s "
            "AND account_uuid = %s AND kind = %s AND status = 'pending'",
            (REPLACED_REASON, realm, war_key, account, action_kind),
        )
        row = _insert(conn, realm, war_key, action_kind, account, {"picks": wanted},
                      source="web", discord_user_id=discord_user_id)
    return _action(row)


def clean_availability(payload: Any, voting: dict) -> dict:
    """`{"date", "hours"}` (hours in offered order) or `{"none": True}`; WarActionError for anything
    the latest private state already refuses."""
    if not isinstance(payload, dict):
        raise WarActionError(400, "payload must be an object.")
    if payload.get("none") is True and payload.get("date") is None:
        return {"none": True}
    day = _day(payload.get("date"))
    hours = payload.get("hours")
    if day is None or not isinstance(hours, list) or len(hours) > MAX_HOURS:
        raise WarActionError(400, "Send a date and its start times, or none.")
    row = next((d for d in voting["dates"] if d["date"] == day), None)
    if row is None:
        raise WarActionError(409, NOT_SHOWN_REASON)
    if not date_is_editable(row):
        raise WarActionError(409, DAY_DECIDED_REASON)
    wanted = []
    for value in hours:
        hour = battle_day_hour(value)
        if hour is None or hour not in voting["hours"]:
            raise WarActionError(400, BAD_HOURS_REASON)
        wanted.append(hour)
    return {"date": day, "hours": [hour for hour in voting["hours"] if hour in wanted]}


def queue_availability(realm: str, war_key: str, account: str, payload: Any, *,
                       discord_user_id: str | None = None) -> dict:
    """Queue a web availability change (contract v1.4). Replaces the account's still-pending change
    of the same date (or its pending "none" answer)."""
    with database.transaction() as conn:
        war = _war(conn, realm, war_key)
        if war is None:
            raise WarActionError(404, "War not found")
        voting, _ = _war_voting(war)
        if not vote_is_open(voting) or voting["kind"] != AVAILABILITY:
            raise WarActionError(409, CLOSED_REASON)
        if _bare(account) not in voting["eligible"]:
            raise WarActionError(403, NOT_ELIGIBLE_REASON)
        change = clean_availability(payload, voting)
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (f"war_actions:{account}",))
        _check_rate(conn, account)
        conn.execute(
            "UPDATE war_actions SET status = 'expired', reason = %s WHERE realm_id = %s AND war_key = %s "
            "AND account_uuid = %s AND kind = 'availability' AND status = 'pending' "
            "AND COALESCE(payload ->> 'date', '') = %s",
            (REPLACED_REASON, realm, war_key, account, change.get("date") or ""),
        )
        row = _insert(conn, realm, war_key, AVAILABILITY, account, change,
                      source="web", discord_user_id=discord_user_id)
    return _action(row)


def clean_answer(payload: Any) -> dict:
    if not isinstance(payload, dict):
        raise WarActionError(400, "payload must be an object.")
    target = payload.get("target_faction_id")
    accept = payload.get("accept")
    if not isinstance(target, str) or not _FACTION_ID_RE.match(target):
        raise WarActionError(400, "target_faction_id must be a faction id.")
    if not isinstance(accept, bool):
        raise WarActionError(400, "accept must be true or false.")
    return {"target_faction_id": target, "accept": accept}


def queue_call_answer(realm: str, war_key: str, account: str, payload: Any, *, source: str,
                      discord_user_id: str | None = None, require_open_call: bool = True) -> dict:
    """Queue a call to arms answer. The website refuses one for a call PS does not know as open;
    the bot's route queues it anyway and lets the plugin give the reason."""
    if source not in SOURCES:
        raise ValueError(f"unknown source {source!r}")
    answer = clean_answer(payload)
    with database.transaction() as conn:
        war = _war(conn, realm, war_key)
        if war is None:
            raise WarActionError(404, "War not found")
        if require_open_call:
            call = open_calls(conn, realm, war_key).get(answer["target_faction_id"].lower())
            # Only the called faction's leader may answer, and anyone else gets the same reply as for
            # no call, so the route does not reveal which factions have been called.
            if (war["status"] != "active" or call is None or call["leader_account"] is None
                    or _bare(call["leader_account"]) != _bare(account)):
                raise WarActionError(409, NO_CALL_REASON)
            answer["target_faction_id"] = call["target"]["id"]
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (f"war_actions:{account}",))
        _check_rate(conn, account)
        row = _insert(conn, realm, war_key, "call_to_arms_answer", account, answer,
                      source=source, discord_user_id=discord_user_id)
    return _action(row)


def status(action_id: int) -> dict | None:
    """One action's status for the bot, or None when there is no such row."""
    if not 0 < action_id < 2**63:
        return None
    with database.connect() as conn:
        _expire_stale(conn)
        row = conn.execute("SELECT * FROM war_actions WHERE id = %s", (action_id,)).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "realm_id": row["realm_id"],
        "war_key": row["war_key"],
        "kind": row["kind"],
        "status": row["status"],
        "reason": row["reason"],
        "retry": bool(row.get("retry")),
        "created_at": iso(row["created_at"]),
        "applied_at": iso(row["applied_at"]),
    }


# --- the plugin's poll ------------------------------------------------------------------


def pending(realm: str, limit: int | None = None) -> list[dict]:
    """Pending actions of a realm, oldest first, stamped as delivered.

    A row is offered again 30 seconds after it was handed out, until the plugin
    reports it or it expires ten minutes after creation.
    """
    limit = max(1, min(MAX_LIMIT, DEFAULT_LIMIT if limit is None else int(limit)))
    with database.connect() as conn:
        _expire_stale(conn)
        rows = conn.execute(
            "WITH picked AS ("
            " SELECT id FROM war_actions WHERE realm_id = %s AND status = 'pending'"
            " AND (delivered_at IS NULL OR delivered_at <= now() - %s)"
            " ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED)"
            " UPDATE war_actions a SET delivered_at = now() FROM picked WHERE a.id = picked.id"
            " RETURNING a.*",
            (realm, REDELIVER_AFTER, limit),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "war_key": row["war_key"],
            "kind": row["kind"],
            "account_uuid": row["account_uuid"],
            "source": row["source"],
            "payload": row["payload"],
            "created_at": iso(row["created_at"]),
        }
        for row in sorted(rows, key=lambda row: row["id"])
    ]


def record_results(realm: str | None, results: Any) -> dict:
    """Store the plugin's results; returns `{"acked": [ids], "rejected"?: [{id, reason}]}`.

    The first result for a row wins, so a late duplicate cannot turn "applied" into
    "rejected". An expired row still takes a result: the plugin's word is the truth.
    """
    if not isinstance(results, list):
        raise WarActionError(400, "results must be a list")
    if len(results) > MAX_RESULTS:
        raise WarActionError(400, f"At most {MAX_RESULTS} results per request")
    acked: list[int] = []
    rejected: list[dict] = []
    with database.connect() as conn:
        for item in results:
            item_id = item.get("id") if isinstance(item, dict) else None
            if isinstance(item_id, bool) or not isinstance(item_id, int) or not 0 < item_id < 2**63:
                rejected.append({"id": None, "reason": "id must be an integer"})
                continue
            result = item.get("status")
            if result not in RESULT_STATUSES:
                rejected.append({"id": item_id, "reason": "status must be applied or rejected"})
                continue
            reason = item.get("reason")
            reason = reason.strip()[:MAX_REASON] or None if isinstance(reason, str) else None
            # The plugin says whether a refusal can pass later; an applied action never needs a retry.
            retry = result == "rejected" and item.get("retry") is True
            found = conn.execute(
                # A repeated answer (a lost /applied re-delivered) keeps the first apply time, so a vote
                # changed in game since then still wins on /me.
                "UPDATE war_actions SET status = %s, reason = %s, retry = %s, applied_at = COALESCE(applied_at, now()) "
                "WHERE id = %s AND (%s::text IS NULL OR realm_id = %s) AND status IN ('pending', 'expired') "
                "RETURNING id",
                (result, reason, retry, item_id, realm, realm),
            ).fetchone()
            if found is None:
                exists = conn.execute(
                    "SELECT 1 FROM war_actions WHERE id = %s AND (%s::text IS NULL OR realm_id = %s)",
                    (item_id, realm, realm),
                ).fetchone()
                if exists is None:
                    rejected.append({"id": item_id, "reason": "no such action"})
                    continue
            acked.append(item_id)
    reply: dict[str, Any] = {"acked": acked}
    if rejected:
        reply["rejected"] = rejected
    return reply
