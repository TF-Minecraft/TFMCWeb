"""War history page model: stored war events and battle records in, public JSON out.

Pure functions only, so the whole model is tested without a database. The data
contract with SimpleFactions is `docs/docs/map/war-history.md`; this module is
the part of it PS owns: how events and battle records merge into one war page.

Events are SimpleFactions' account of the war (declaration, calls to arms,
battles resolved, the end). Battle records are its per-battle fighter stats.
A war may have either or both:

* a ``battle_resolved`` event names its battle record by ``record_id``, so the
  two merge into one battle entry, the event's numbers winning;
* a record with no event (a raid, or a war backfilled from the archive before
  events existed) becomes a battle entry of its own;
* a war known only from records has no state, so it reads as ended, with its
  name taken from the record.

Never published: fighter ``key`` (a character id that embeds the account UUID),
anything in the war state or event payloads that is not listed below.
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Iterable
from datetime import datetime, timezone
from typing import Any

SIDES = ("attacker", "defender")

EVENT_TYPES = (
    "war_declared",
    "participant_joined",
    "day_vote_closed",
    "battle_scheduled",
    "battle_postponed",
    "battle_resolved",
    "war_ended",
    # Contract v1.1: only refreshes the latest state's battle day; it has no timeline entry.
    "next_battle_day",
)

SILENT_EVENT_TYPES = ("next_battle_day",)

RESOLUTIONS = ("fought", "autoresolve", "forfeit", "naval_default", "staff")

PARTICIPANT_ROLES = ("leader", "main", "subject", "ally", "coalition", "backer")
# Page-model only: a row of fighters hired by a faction rather than its own members.
MERCENARY_ROLE = "mercenary"
_ROLE_ORDER = {role: i for i, role in enumerate(PARTICIPANT_ROLES)}

# Entries in the timeline for a battle known only from its record.
BATTLE_RECORDED = "battle_recorded"

WAR_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_WAR_KEY_STARTED_RE = re.compile(r"^w\d+-(\d+)$")
_RGB_RE = re.compile(r"^\d{1,3},\d{1,3},\d{1,3}$")
_DAY_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
# §x§r§r§g§g§b§b, &#rrggbb, <#rrggbb>, #rrggbb and legacy §c / &c codes.
_CODES_RE = re.compile(
    r"[§&]x(?:[§&][0-9a-f]){6}|&#[0-9a-f]{6}|<#[0-9a-f]{6}>|#[0-9a-f]{6}|[§&][0-9a-fk-or]",
    re.IGNORECASE,
)

# The WarState keys a public reply may carry; anything else SF sends is dropped.
_STATE_KEYS = (
    "name",
    "name_raw",
    "goal",
    "war_type",
    "civil_war",
    "status",
    "schedule_phase",
    "campaign_phase",
    "buildup",
    "day_vote_closes_at",
    "battle_day",
    "scheduled_at",
    "route_length",
    "objective_province_id",
    "objective_held_by",
    "occupied_by_attacker",
    "occupied_by_defender",
    "battles_fought",
)

# How many heroes of each kind the top fighters list keeps.
TOP_BY_KILLS = 10
TOP_BY_DAMAGE = 5
TOP_BY_HEALING = 5

ProvinceNames = Callable[[int], "str | None"]


def _no_names(_province_id: int) -> str | None:
    return None


# --- scalars -------------------------------------------------------------------


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_instant(value: Any) -> datetime | None:
    """An ISO-8601 instant (Java `Instant.toString()`) as aware UTC, or None."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip())
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def from_epoch_ms(value: Any) -> datetime | None:
    number = _finite(value)
    if number is None or number <= 0:
        return None
    try:
        return datetime.fromtimestamp(number / 1000.0, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def _finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _int(value: Any, default: int | None = 0) -> int | None:
    number = _finite(value)
    return default if number is None else int(number)


def _count(value: Any) -> int:
    """A count SF sends as a number; a list (older exports) counts its items."""
    if isinstance(value, list):
        return len(value)
    number = _int(value, 0) or 0
    return max(0, number)


def _num(value: Any) -> float:
    number = _finite(value)
    return 0.0 if number is None else number


def _str(value: Any, limit: int = 200) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text[:limit] if text else None


def strip_codes(value: Any) -> str:
    """A Minecraft name without colour or format codes."""
    if not isinstance(value, str):
        return ""
    return _CODES_RE.sub("", re.sub("§{2,}", "§", value)).strip()


def side_of(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    side = value.strip().lower()
    return side if side in SIDES else None


def other_side(side: str) -> str:
    return "defender" if side == "attacker" else "attacker"


def war_key_started_at(war_key: str) -> datetime | None:
    """`w<id>-<epoch seconds>`: the war's start, the same instant SF keys records by."""
    match = _WAR_KEY_STARTED_RE.match(war_key or "")
    if not match:
        return None
    seconds = int(match.group(1))
    if seconds <= 0:
        return None
    try:
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def _pair(value: Any) -> dict[str, int]:
    source = value if isinstance(value, dict) else {}
    return {side: _count(source.get(side)) for side in SIDES}


def _zero_pair() -> dict[str, int]:
    return {side: 0 for side in SIDES}


# --- factions and state ----------------------------------------------------------


def faction_ref(raw: Any) -> dict | None:
    """A public FactionRef, or None when there is no id or name to show."""
    if not isinstance(raw, dict):
        return None
    faction_id = _str(raw.get("id"), 64)
    # Gradient names carry a colour code per letter, so a short name can run past a thousand characters.
    name_raw = _str(raw.get("name_raw"), 1024) or _str(raw.get("name"), 1024)
    # Prefer stripping the raw name here: an older plugin build left a section sign per letter in "name".
    name = strip_codes(name_raw) or strip_codes(raw.get("name")) or (faction_id or "")
    if not faction_id and not name:
        return None
    rgb = _str(raw.get("rgb"), 11)
    founded_at = _finite(raw.get("founded_at"))
    return {
        "id": faction_id,
        "founded_at": None if founded_at is None else int(founded_at),
        "name": name,
        "name_raw": name_raw or name,
        "rgb": rgb if rgb and _RGB_RE.match(rgb) else None,
    }


def _participant(raw: Any) -> dict | None:
    ref = faction_ref(raw)
    if ref is None:
        return None
    role = _str(raw.get("role"), 32)
    role = role.lower() if role else None
    joined_at = parse_instant(raw.get("joined_at"))
    return {**ref, "role": role if role in PARTICIPANT_ROLES else None, "joined_at": iso(joined_at)}


def public_state(state: Any) -> dict | None:
    """The WarState fields a public reply may carry, with clean participant lists."""
    if not isinstance(state, dict):
        return None
    out: dict[str, Any] = {}
    for key in _STATE_KEYS:
        if key not in state:
            continue
        value = state[key]
        if isinstance(value, (str, bool)) or value is None:
            out[key] = value[:200] if isinstance(value, str) else value
        elif key.startswith("occupied_by_"):
            out[key] = _count(value)
        elif _finite(value) is not None:
            out[key] = _int(value)
    initiative = state.get("initiative")
    if isinstance(initiative, dict):
        out["initiative"] = {
            **{side: _int(initiative.get(side)) for side in SIDES},
            "holder": side_of(initiative.get("holder")),
        }
    sides = state.get("sides") if isinstance(state.get("sides"), dict) else {}
    out["sides"] = {}
    for side in SIDES:
        rows = sides.get(side) if isinstance(sides.get(side), list) else []
        participants = [p for p in (_participant(row) for row in rows[:200]) if p is not None]
        # Leaders first, as SF sends them, kept stable when an older SF does not.
        participants.sort(key=lambda p: p["role"] != "leader")
        out["sides"][side] = participants
    if "name" in out:
        out["name"] = strip_codes(out["name"]) or out["name"]
    return out


def side_leaders(state: dict | None, side: str) -> list[dict]:
    if not state:
        return []
    rows = state.get("sides", {}).get(side) or []
    leaders = [row for row in rows if row.get("role") == "leader"]
    return leaders or rows[:1]


def side_name(state: dict | None, side: str) -> str:
    """The leader's name for a side, or 'the attackers' / 'the defenders'."""
    names = [row["name"] for row in side_leaders(state, side) if row.get("name")]
    if not names:
        return f"the {side}s"
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + " and " + names[-1]


def _strip_ref_role(row: dict) -> dict:
    return {key: row[key] for key in ("id", "founded_at", "name", "name_raw", "rgb")}


# --- dates for summaries -----------------------------------------------------------

try:
    from zoneinfo import ZoneInfo

    _SERVER_ZONE: Any = ZoneInfo("Europe/Paris")
except Exception:  # noqa: BLE001 - no tz database: fall back to UTC, labelled as such.
    _SERVER_ZONE = timezone.utc


def format_day(value: Any) -> str | None:
    """`2026-11-19` (or an instant) as `19/11/2026`."""
    if isinstance(value, str):
        match = _DAY_RE.match(value.strip())
        if match:
            return f"{match.group(3)}/{match.group(2)}/{match.group(1)}"
    moment = parse_instant(value)
    if moment is None:
        return None
    return moment.astimezone(_SERVER_ZONE).strftime("%d/%m/%Y")


def format_instant(value: Any) -> str | None:
    """An instant as `19/11/2026 21:00 CET`, in server time as the wiki states it."""
    moment = parse_instant(value)
    if moment is None:
        return None
    local = moment.astimezone(_SERVER_ZONE)
    return f"{local.strftime('%d/%m/%Y %H:%M')} {local.tzname() or 'UTC'}"


# --- events ----------------------------------------------------------------------


def _regiments_lost_rows(value: Any) -> list[dict]:
    rows: list[dict] = []
    if not isinstance(value, list):
        return rows
    for raw in value[:500]:
        if not isinstance(raw, dict):
            continue
        side = side_of(raw.get("side"))
        count = _count(raw.get("count"))
        if side is None or count <= 0:
            continue
        rows.append({
            "faction": faction_ref(raw.get("faction")),
            "side": side,
            "regiment": _str(raw.get("regiment"), 64),
            "regiment_name": strip_codes(raw.get("regiment_name")) or _str(raw.get("regiment"), 64),
            "count": count,
        })
    return rows


def _lives(value: Any) -> dict | None:
    if not isinstance(value, dict):
        return None
    out = {}
    for side in SIDES:
        raw = value.get(side)
        if not isinstance(raw, dict):
            return None
        out[side] = {"left": max(0, _int(raw.get("left")) or 0), "max": max(0, _int(raw.get("max")) or 0)}
    return out


def public_payload(event_type: str, payload: Any) -> dict:
    """The payload fields each event type publishes, cleaned."""
    p = payload if isinstance(payload, dict) else {}
    if event_type == "participant_joined":
        role = _str(p.get("role"), 32)
        return {
            "faction": faction_ref(p.get("faction")),
            "side": side_of(p.get("side")),
            "role": role.lower() if role and role.lower() in PARTICIPANT_ROLES else None,
        }
    if event_type == "day_vote_closed":
        return {"battle_day": _str(p.get("battle_day"), 32), "quorum": p.get("quorum") is not False}
    if event_type == "battle_scheduled":
        return {
            "scheduled_at": iso(parse_instant(p.get("scheduled_at"))),
            "province_id": _int(p.get("province_id"), None),
            "kind": _lower(p.get("kind")),
        }
    if event_type in ("battle_postponed", "next_battle_day"):
        return {"battle_day": _str(p.get("battle_day"), 32)}
    if event_type == "battle_resolved":
        resolution = _lower(p.get("resolution"))
        return {
            "battle_number": _int(p.get("battle_number"), None),
            "province_id": _int(p.get("province_id"), None),
            "kind": _lower(p.get("kind")),
            "leg": _lower(p.get("leg")),
            "winner": side_of(p.get("winner")),
            "resolution": resolution if resolution in RESOLUTIONS else "fought",
            "battle_id": _str(p.get("battle_id"), 160),
            "record_id": _str(p.get("record_id"), 160),
            "deaths": _pair(p.get("deaths")),
            "lives": _lives(p.get("lives")),
            "regiments_lost": _regiments_lost_rows(p.get("regiments_lost")),
        }
    if event_type == "war_ended":
        return {
            "reason": _lower(p.get("reason")),
            "winner": side_of(p.get("winner")),
            "truce_until": iso(parse_instant(p.get("truce_until"))),
        }
    return {}


def _lower(value: Any) -> str | None:
    text = _str(value, 64)
    return text.lower() if text else None


def _regiments_by_side(rows: list[dict]) -> dict[str, int]:
    out = _zero_pair()
    for row in rows:
        out[row["side"]] += row["count"]
    return out


# --- battle records ----------------------------------------------------------------


def record_side_roles(record: dict) -> dict[str, str]:
    """Battle side id (lower case) -> the war side that battle side fought for."""
    roles: dict[str, str] = {}
    sides = record.get("sides") if isinstance(record.get("sides"), list) else []
    for side in sides:
        if not isinstance(side, dict):
            continue
        side_id = _str(side.get("id"), 64)
        role = side_of(side.get("warRole"))
        if side_id and role:
            roles[side_id.lower()] = role
    return roles


def record_winner(record: dict) -> str | None:
    winner = _str(record.get("winner"), 64)
    if not winner:
        return None
    return record_side_roles(record).get(winner.lower()) or side_of(winner)


def record_lives(record: dict) -> dict | None:
    lives: dict[str, dict] = {}
    sides = record.get("sides") if isinstance(record.get("sides"), list) else []
    for side in sides:
        if not isinstance(side, dict):
            continue
        role = side_of(side.get("warRole"))
        if role and role not in lives:
            lives[role] = {"left": max(0, _int(side.get("lives")) or 0), "max": max(0, _int(side.get("maxLives")) or 0)}
    return lives if len(lives) == len(SIDES) else None


def record_fighters(record: dict) -> list[dict]:
    """Every fighter of a record with the war side they fought for (or None)."""
    roles = record_side_roles(record)
    raw_fighters = record.get("fighters") if isinstance(record.get("fighters"), list) else []
    out = []
    for index, raw in enumerate(raw_fighters):
        if not isinstance(raw, dict):
            continue
        side_id = _str(raw.get("side"), 64)
        side = roles.get(side_id.lower()) if side_id else None
        if side is None:
            side = side_of(side_id)
        founded = _finite(raw.get("factionFoundedAt"))
        out.append({
            # Internal only: groups one character across battles. Never published.
            "_key": _str(raw.get("key"), 128) or f"#{index}",
            "name": strip_codes(raw.get("name")) or "Unknown",
            "side": side,
            "faction_name": strip_codes(raw.get("faction")),
            "faction_raw": _str(raw.get("faction"), 200),
            "faction_id": _str(raw.get("factionId"), 64),
            "faction_founded_at": None if founded is None else int(founded),
            "hirer_id": _str(raw.get("hirerFactionId"), 64),
            "class_name": strip_codes(raw.get("className")) or None,
            "kills": max(0, _int(raw.get("kills")) or 0),
            "deaths": max(0, _int(raw.get("deaths")) or 0),
            "assists": max(0, _int(raw.get("assists")) or 0),
            "team_kills": max(0, _int(raw.get("teamKills")) or 0),
            "damage": _num(raw.get("damage")),
            "friendly_damage": _num(raw.get("friendlyDamage")),
            "damage_taken": _num(raw.get("damageTaken")),
            "healing": _num(raw.get("healing")),
            "cc": _num(raw.get("cc")),
            "friendly_cc": _num(raw.get("friendlyCc")),
        })
    return out


def _record_deaths(fighters: list[dict]) -> dict[str, int]:
    out = _zero_pair()
    for fighter in fighters:
        if fighter["side"]:
            out[fighter["side"]] += fighter["deaths"]
    return out


def _record_fighter_counts(fighters: list[dict]) -> dict[str, int]:
    keys: dict[str, set] = {side: set() for side in SIDES}
    for fighter in fighters:
        if fighter["side"]:
            keys[fighter["side"]].add(fighter["_key"])
    return {side: len(keys[side]) for side in SIDES}


def _kind_of_record(record: dict) -> str | None:
    if record.get("raid") is True:
        return "raid"
    kind = _lower(record.get("type"))
    if kind and record.get("naval") is True and "naval" not in kind:
        return f"naval_{kind}"
    return kind


# --- the model -----------------------------------------------------------------------


def _event_state(event: dict) -> dict | None:
    return public_state(event.get("state"))


def latest_state(events: list[dict]) -> dict | None:
    for event in reversed(events):
        state = _event_state(event)
        if state is not None:
            return state
    return None


def _round(value: float) -> float:
    return round(value, 1)


def _battle_from_event(event: dict, payload: dict, names: ProvinceNames) -> dict:
    province_id = payload["province_id"]
    return {
        "battle_number": payload["battle_number"],
        "at": iso(event["at"]),
        "province_id": province_id,
        "province_name": names(province_id) if province_id is not None else None,
        "kind": payload["kind"],
        "leg": payload["leg"],
        "raid": False,
        "name": None,
        "winner": payload["winner"],
        "resolution": payload["resolution"],
        "battle_id": payload["battle_id"],
        "record_id": payload["record_id"],
        "started_at": None,
        "ended_at": None,
        "deaths": payload["deaths"],
        "lives": payload["lives"],
        "regiments_lost": _regiments_by_side(payload["regiments_lost"]),
        "fighters": None,
    }


def _battle_from_record(record: dict, fighters: list[dict], names: ProvinceNames) -> dict:
    ended = from_epoch_ms(record.get("endedAt"))
    province_id = _int(record.get("provinceId"), None)
    return {
        "battle_number": None,
        "at": iso(ended or from_epoch_ms(record.get("startedAt"))),
        "province_id": province_id,
        "province_name": names(province_id) if province_id is not None else None,
        "kind": _kind_of_record(record),
        "leg": None,
        "raid": record.get("raid") is True,
        "name": strip_codes(record.get("name")) or None,
        "winner": record_winner(record),
        "resolution": "fought",
        "battle_id": _str(record.get("battleId"), 160),
        "record_id": _str(record.get("id"), 160),
        "started_at": iso(from_epoch_ms(record.get("startedAt"))),
        "ended_at": iso(ended),
        "deaths": _record_deaths(fighters),
        "lives": record_lives(record),
        "regiments_lost": None,
        "fighters": _record_fighter_counts(fighters),
    }


def _attach_record(battle: dict, record: dict, fighters: list[dict]) -> None:
    battle["name"] = strip_codes(record.get("name")) or None
    if not battle.get("province_name"):
        battle["province_name"] = place_from_battle_name(battle["name"])
    battle["started_at"] = iso(from_epoch_ms(record.get("startedAt")))
    battle["ended_at"] = iso(from_epoch_ms(record.get("endedAt")))
    battle["fighters"] = _record_fighter_counts(fighters)
    if battle["lives"] is None:
        battle["lives"] = record_lives(record)
    if battle["province_id"] is None:
        battle["province_id"] = _int(record.get("provinceId"), None)


def _sort_key_at(entry: dict) -> str:
    return entry.get("at") or ""


class _Participants:
    """Per-faction rows for one war (or one battle) on each side."""

    def __init__(self, state: dict | None):
        self.rows: dict[tuple, dict] = {}
        self.refs: dict[str, dict] = {}
        for side in SIDES:
            for participant in (state or {}).get("sides", {}).get(side, []):
                self._ensure(side, "faction", participant["id"] or participant["name"], participant,
                             role=participant["role"], joined_at=participant["joined_at"])

    def _ensure(self, side: str, kind: str, ident: str, ref: dict, *, role=None, joined_at=None) -> dict:
        key = (side, kind, ident)
        row = self.rows.get(key)
        if row is None:
            row = {
                "faction": _strip_ref_role(ref),
                "side": side,
                "role": MERCENARY_ROLE if kind == "mercs" else role,
                "mercenary": kind == "mercs",
                "joined_at": joined_at,
                "fighters": 0,
                "kills": 0,
                "deaths": 0,
                "damage": 0.0,
                "healing": 0.0,
                "regiments_lost": 0,
                "share_of_side_kills": None,
                "_fighter_keys": set(),
            }
            self.rows[key] = row
        if ref.get("id") and kind == "faction":
            self.refs.setdefault(ref["id"], row["faction"])
        return row

    def joined(self, ref: dict, side: str, role: str | None, at: str | None) -> None:
        """A call to arms the latest state no longer lists (or a war with no state)."""
        if any(r["faction"]["id"] == ref["id"] and r["side"] == side for r in self.rows.values()):
            return
        self._ensure(side, "faction", ref["id"] or ref["name"], ref, role=role, joined_at=at)

    def _ref_for(self, faction_id: str, fallback_name: str | None = None) -> dict:
        ref = self.refs.get(faction_id)
        if ref is not None:
            return ref
        return {"id": faction_id, "founded_at": None, "name": fallback_name or faction_id,
                "name_raw": fallback_name or faction_id, "rgb": None}

    def _row_by_name(self, side: str, name: str) -> dict | None:
        folded = name.casefold()
        for row in self.rows.values():
            if row["side"] == side and not row["mercenary"] and row["faction"]["name"].casefold() == folded:
                return row
        return None

    def add_fighter(self, fighter: dict) -> None:
        side = fighter["side"]
        if side is None:
            return
        if fighter["hirer_id"]:
            ref = self._ref_for(fighter["hirer_id"])
            row = self._ensure(side, "mercs", fighter["hirer_id"], ref)
        elif fighter["faction_id"]:
            ref = self.refs.get(fighter["faction_id"]) or {
                "id": fighter["faction_id"],
                "founded_at": fighter["faction_founded_at"],
                "name": fighter["faction_name"] or fighter["faction_id"],
                "name_raw": fighter["faction_raw"] or fighter["faction_name"] or fighter["faction_id"],
                "rgb": None,
            }
            row = self._ensure(side, "faction", fighter["faction_id"], ref)
        else:
            # A record from before factionId existed: match the display name.
            name = fighter["faction_name"] or "No faction"
            row = self._row_by_name(side, name) or self._ensure(
                side, "name", name.casefold(),
                {"id": None, "founded_at": None, "name": name, "name_raw": fighter["faction_raw"] or name, "rgb": None},
            )
        row["_fighter_keys"].add(fighter["_key"])
        row["kills"] += fighter["kills"]
        row["deaths"] += fighter["deaths"]
        row["damage"] += fighter["damage"]
        row["healing"] += fighter["healing"]

    def add_regiments(self, rows: list[dict]) -> None:
        for lost in rows:
            ref = lost["faction"]
            if ref is None:
                continue
            row = None
            if ref["id"]:
                row = self.rows.get((lost["side"], "faction", ref["id"]))
            if row is None:
                row = self._ensure(lost["side"], "faction", ref["id"] or ref["name"], self.refs.get(ref["id"] or "") or ref)
            row["regiments_lost"] += lost["count"]

    def result(self, *, include_idle: bool = True) -> list[dict]:
        kills = _zero_pair()
        for row in self.rows.values():
            kills[row["side"]] += row["kills"]
        out = []
        for row in self.rows.values():
            row = dict(row)
            row["fighters"] = len(row.pop("_fighter_keys"))
            if not include_idle and not (row["fighters"] or row["regiments_lost"]):
                continue
            row["damage"] = _round(row["damage"])
            row["healing"] = _round(row["healing"])
            total = kills[row["side"]]
            row["share_of_side_kills"] = round(row["kills"] / total, 4) if total else None
            out.append(row)
        out.sort(key=lambda r: (
            SIDES.index(r["side"]),
            r["mercenary"],
            _ROLE_ORDER.get(r["role"], len(PARTICIPANT_ROLES)),
            -r["kills"],
            r["faction"]["name"].casefold(),
        ))
        return out


def _public_fighter(fighter: dict, hired_by: str | None) -> dict:
    return {
        "name": fighter["name"],
        "faction": fighter["faction_name"] or None,
        "faction_id": fighter["faction_id"],
        "hired_by": hired_by,
        "side": fighter["side"],
        "class_name": fighter["class_name"],
        "kills": fighter["kills"],
        "deaths": fighter["deaths"],
        "assists": fighter["assists"],
        "team_kills": fighter["team_kills"],
        "damage": _round(fighter["damage"]),
        "friendly_damage": _round(fighter["friendly_damage"]),
        "damage_taken": _round(fighter["damage_taken"]),
        "healing": _round(fighter["healing"]),
        "cc": _round(fighter["cc"]),
        "friendly_cc": _round(fighter["friendly_cc"]),
    }


def _top_fighters(all_fighters: Iterable[dict], hirer_name: Callable[[str | None], str | None]) -> list[dict]:
    totals: dict[str, dict] = {}
    for fighter in all_fighters:
        if fighter["side"] is None:
            continue
        row = totals.get(fighter["_key"])
        if row is None:
            row = totals[fighter["_key"]] = {
                "name": fighter["name"],
                "faction": fighter["faction_name"] or None,
                "hired_by": hirer_name(fighter["hirer_id"]),
                "side": fighter["side"],
                "battles": 0,
                "kills": 0,
                "deaths": 0,
                "damage": 0.0,
                "healing": 0.0,
            }
        # The latest record wins for the name and the side; records come oldest first.
        row["name"] = fighter["name"]
        row["side"] = fighter["side"]
        row["battles"] += 1
        row["kills"] += fighter["kills"]
        row["deaths"] += fighter["deaths"]
        row["damage"] += fighter["damage"]
        row["healing"] += fighter["healing"]
    rows = list(totals.values())
    chosen: dict[int, dict] = {}
    for key, limit in (("kills", TOP_BY_KILLS), ("damage", TOP_BY_DAMAGE), ("healing", TOP_BY_HEALING)):
        ranked = sorted((r for r in rows if r[key] > 0), key=lambda r: (-r[key], r["name"].casefold()))
        for row in ranked[:limit]:
            chosen[id(row)] = row
    out = sorted(chosen.values(), key=lambda r: (-r["kills"], -r["damage"], r["name"].casefold()))
    for row in out:
        row["damage"] = _round(row["damage"])
        row["healing"] = _round(row["healing"])
    return out


_BATTLE_NAME_PREFIXES = ("Battle of ", "Siege of ", "Raid on ", "Naval Battle of ", "Battle at ")


def place_from_battle_name(name: Any) -> str | None:
    """`Gildrec` from SimpleFactions' `Battle of Gildrec`, for provinces the map has no name for."""
    text = strip_codes(name)
    for prefix in _BATTLE_NAME_PREFIXES:
        if text.startswith(prefix) and len(text) > len(prefix):
            return text[len(prefix):].strip()
    return None


def _place(battle: dict) -> str:
    if battle.get("province_name"):
        return battle["province_name"]
    from_record = place_from_battle_name(battle.get("name"))
    if from_record:
        return from_record
    if battle.get("province_id") is not None:
        return f"Province {battle['province_id']}"
    return "an unnamed field"


def _deaths_sentence(deaths: dict) -> str:
    a, d = deaths.get("attacker", 0), deaths.get("defender", 0)
    if not a and not d:
        return ""
    return f" {a} {'attacker' if a == 1 else 'attackers'} and {d} {'defender' if d == 1 else 'defenders'} fell."


_KIND_WORDS = {
    "field": "field battle",
    "siege": "siege",
    "naval": "naval battle",
    "naval_invasion": "naval invasion",
    "raid": "raid",
}


def _kind_words(kind: str | None) -> str:
    if not kind:
        return "battle"
    return _KIND_WORDS.get(kind, f"{kind.replace('_', ' ')} battle")


def _article(phrase: str) -> str:
    return "An" if phrase[:1].lower() in "aeiou" else "A"


def summarize(event_type: str, payload: dict, state: dict | None, battle: dict | None = None,
              names: ProvinceNames = _no_names) -> str:
    """One plain in-world sentence for a timeline entry."""
    attackers, defenders = side_name(state, "attacker"), side_name(state, "defender")

    def named(side: str | None) -> str:
        return attackers if side == "attacker" else defenders

    if event_type == "war_declared":
        if state and state.get("civil_war"):
            return _cap(f"{attackers} rose in civil war against {defenders}.")
        return _cap(f"{attackers} declared war on {defenders}.")
    if event_type == "participant_joined":
        faction = (payload.get("faction") or {}).get("name") or "A faction"
        side, role = payload.get("side"), payload.get("role")
        leader = named(side) if side else "the war"
        if role == "backer":
            return _cap(f"{faction} backed {leader}.")
        if role == "coalition":
            return _cap(f"{faction} joined {leader} as part of the coalition.")
        if role == "subject":
            return _cap(f"{faction} took the field for its overlord, {leader}.")
        return _cap(f"{faction} answered the call to arms and joined {leader}.")
    if event_type == "day_vote_closed":
        day = format_day(payload.get("battle_day"))
        if not day:
            return "The day vote closed without a battle day."
        if payload.get("quorum") is False:
            return f"Too few voted on the day, so the first battle was set for {day}."
        return f"The first battle was set for {day}."
    if event_type == "battle_scheduled":
        kind = _kind_words(payload.get("kind"))
        province_id = payload.get("province_id")
        where = ""
        if province_id is not None:
            where = f" at {names(province_id) or f'Province {province_id}'}"
        when = format_instant(payload.get("scheduled_at"))
        return f"{_article(kind)} {kind} was set{where}" + (f" for {when}." if when else ".")
    if event_type == "battle_postponed":
        day = format_day(payload.get("battle_day"))
        return f"The battle was postponed to {day}." if day else "The battle was postponed."
    if event_type == "battle_resolved" and battle is not None:
        place = _place(battle)
        winner = battle.get("winner")
        resolution = battle.get("resolution")
        deaths = _deaths_sentence(battle.get("deaths") or {})
        if winner is None:
            return f"Battle of {place}: no side carried the day.{deaths}"
        loser = named(other_side(winner))
        if resolution == "forfeit":
            return _cap(f"{loser} could not attack at {place} and forfeited the battle to {named(winner)}.")
        if resolution == "naval_default":
            return _cap(f"{loser} had no navy berthed to reach {place}, so the battle went to {named(winner)}.")
        if resolution == "staff":
            return f"Staff settled the battle of {place} in favour of {named(winner)}."
        if resolution == "autoresolve":
            return f"Battle of {place} was decided without a fight: victory for {named(winner)}.{deaths}"
        return f"Battle of {place}: victory for {named(winner)}.{deaths}"
    if event_type == BATTLE_RECORDED and battle is not None:
        title = battle.get("name") or (
            f"Raid on {_place(battle)}" if battle.get("raid") else f"Battle of {_place(battle)}")
        deaths = _deaths_sentence(battle.get("deaths") or {})
        winner = battle.get("winner")
        if winner is None:
            return f"{title}: no side carried the day.{deaths}"
        return f"{title}: victory for {named(winner)}.{deaths}"
    if event_type == "war_ended":
        winner = payload.get("winner")
        reason = payload.get("reason") or ""
        if winner in SIDES:
            text = f"The war ended in victory for {named(winner)}."
        elif "white" in reason:
            text = "The war ended in a white peace."
        elif "admin" in reason or "staff" in reason:
            text = "Staff ended the war."
        else:
            text = "The war ended without a victor."
        truce = format_day(payload.get("truce_until"))
        return text + (f" A truce holds until {truce}." if truce else "")
    return "The war moved on."


def _cap(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def _war_started_at(war_key: str, events: list[dict], records: list[dict]) -> datetime | None:
    started = war_key_started_at(war_key)
    if started is not None:
        return started
    for event in events:
        return event["at"]
    starts = [from_epoch_ms(r.get("startedAt")) for r in records]
    starts = [s for s in starts if s is not None]
    return min(starts) if starts else None


def _record_sides_state(rows: list[dict]) -> dict:
    sides: dict[str, list[dict]] = {}
    for side in SIDES:
        own = [r for r in rows if r["side"] == side and not r["mercenary"] and r["fighters"]]
        own.sort(key=lambda r: -r["fighters"])
        sides[side] = [{**own[0]["faction"], "role": "leader"}] if own else []
    return {"sides": sides}


def build_war_model(
    war_key: str,
    events: list[dict],
    records: list[dict],
    *,
    province_name: ProvinceNames = _no_names,
    fighter_stats_public: bool = True,
) -> dict:
    """The war page model. `events` oldest first ({id, type, at, state, payload});
    `records` are the stored battle record JSON, oldest first."""
    events = sorted(events, key=lambda e: e["at"])
    records = [r for r in records if isinstance(r, dict)]
    state = latest_state(events)

    records_by_id = {r.get("id"): r for r in records if isinstance(r.get("id"), str)}
    fighters_by_record = {id(r): record_fighters(r) for r in records}

    battles: list[dict] = []
    timeline: list[dict] = []
    regiment_rows: list[dict] = []
    matched: set[str] = set()
    joined: list[tuple[dict, str, str | None, str | None]] = []
    ended: dict | None = None
    ended_at: datetime | None = None

    for event in events:
        event_type = event["type"]
        payload = public_payload(event_type, event.get("payload"))
        event_state = _event_state(event) or state
        battle = None
        if event_type == "battle_resolved":
            battle = _battle_from_event(event, payload, province_name)
            record = records_by_id.get(battle["record_id"]) if battle["record_id"] else None
            if record is not None:
                matched.add(battle["record_id"])
                _attach_record(battle, record, fighters_by_record[id(record)])
            battles.append(battle)
            regiment_rows.extend(payload["regiments_lost"])
        elif event_type == "participant_joined" and payload["faction"] and payload["side"]:
            joined.append((payload["faction"], payload["side"], payload["role"], iso(event["at"])))
        elif event_type == "war_ended":
            ended, ended_at = payload, event["at"]
        if event_type in SILENT_EVENT_TYPES:
            continue
        timeline.append({
            "at": iso(event["at"]),
            "type": event_type,
            "summary": summarize(event_type, payload, event_state, battle, province_name),
            "payload": payload,
        })

    has_resolved = any(b["battle_number"] is not None or b["record_id"] for b in battles)
    participants = _Participants(state)
    for ref, side, role, at in joined:
        participants.joined(ref, side, role, at)
    all_fighters = [f for r in records for f in fighters_by_record[id(r)]]
    for fighter in all_fighters:
        participants.add_fighter(fighter)
    participants.add_regiments(regiment_rows)
    # A war with no state names its sides after the faction with the most fighters.
    names_state = state or _record_sides_state(participants.result())
    record_only = []
    for record in records:
        if record.get("id") in matched:
            continue
        battle = _battle_from_record(record, fighters_by_record[id(record)], province_name)
        record_only.append(battle)
        timeline.append({
            "at": battle["at"],
            "type": BATTLE_RECORDED,
            "summary": summarize(BATTLE_RECORDED, {}, names_state, battle, province_name),
            "payload": {"record_id": battle["record_id"], "raid": battle["raid"]},
        })
    if not has_resolved:
        # No battle_resolved events (a backfilled war): number its battles in order.
        number = 0
        for battle in sorted(record_only, key=_sort_key_at):
            if not battle["raid"]:
                number += 1
                battle["battle_number"] = number
    battles.extend(record_only)
    battles.sort(key=lambda b: (_sort_key_at(b), b["battle_number"] or 0))
    timeline.sort(key=_sort_key_at)


    score = {
        "battles_won": _zero_pair(),
        "occupation": {
            "attacker": _count((state or {}).get("occupied_by_attacker")),
            "defender": _count((state or {}).get("occupied_by_defender")),
            "route_length": (state or {}).get("route_length"),
        },
        "deaths": _zero_pair(),
        "regiments_lost": _zero_pair(),
    }
    for battle in battles:
        if battle["winner"] and not battle["raid"]:
            score["battles_won"][battle["winner"]] += 1
        for side in SIDES:
            score["deaths"][side] += (battle["deaths"] or {}).get(side, 0)
            score["regiments_lost"][side] += (battle["regiments_lost"] or {}).get(side, 0)

    started_at = _war_started_at(war_key, events, records)
    if events:
        status = "ended" if ended is not None else "active"
    else:
        status = "ended"
        ends = [from_epoch_ms(r.get("endedAt")) for r in records]
        ends = [e for e in ends if e is not None]
        ended_at = max(ends) if ends else None

    name_raw = (state or {}).get("name_raw") or next(
        (r.get("warName") for r in reversed(records) if isinstance(r.get("warName"), str)), None)
    name = (state or {}).get("name") or strip_codes(name_raw) or war_key
    objective_id = (state or {}).get("objective_province_id")

    def hirer_name(faction_id: str | None) -> str | None:
        if not faction_id:
            return None
        ref = participants.refs.get(faction_id)
        return ref["name"] if ref else faction_id

    model: dict[str, Any] = {
        "war_key": war_key,
        "name": name,
        "name_raw": name_raw or name,
        "state": state,
        "status": status,
        "started_at": iso(started_at),
        "ended_at": iso(ended_at),
        "result": None if ended is None else {k: ended[k] for k in ("reason", "winner", "truce_until")},
        "objective_province_name": province_name(objective_id) if isinstance(objective_id, int) else None,
        "score": score,
        "timeline": timeline,
        "battles": battles,
        "participants": participants.result(),
        "fighter_stats_public": fighter_stats_public,
    }
    if fighter_stats_public:
        model["top_fighters"] = _top_fighters(all_fighters, hirer_name)
    return model


def build_war_summary(model: dict) -> dict:
    """The war list row: who fought whom, how it stands, and when."""
    state = model["state"]
    sides = {}
    for side in SIDES:
        rows = (state or {}).get("sides", {}).get(side, [])
        leaders = [_strip_ref_role(row) for row in side_leaders(state, side)]
        if not rows:
            # No state: name a side after its factions in the battle records.
            rows = [p for p in model["participants"] if p["side"] == side and not p["mercenary"]]
            leaders = [p["faction"] for p in sorted(rows, key=lambda p: -p["fighters"])[:1]]
        sides[side] = {"leaders": leaders, "count": len(rows)}
    phase_keys = ("schedule_phase", "campaign_phase", "buildup", "day_vote_closes_at", "battle_day", "scheduled_at")
    return {
        "war_key": model["war_key"],
        "name": model["name"],
        "name_raw": model["name_raw"],
        "goal": (state or {}).get("goal"),
        "war_type": (state or {}).get("war_type"),
        "civil_war": bool((state or {}).get("civil_war")),
        "status": model["status"],
        "known_from_records_only": state is None,
        "sides": sides,
        "started_at": model["started_at"],
        "ended_at": model["ended_at"],
        "result": model["result"],
        "battles_won": model["score"]["battles_won"],
        "deaths": model["score"]["deaths"],
        "score": model["score"],
        "battle_count": sum(1 for b in model["battles"] if not b["raid"]),
        "phase": {key: (state or {}).get(key) for key in phase_keys},
    }


def build_battle_report(
    war_key: str,
    events: list[dict],
    records: list[dict],
    record_id: str,
    *,
    province_name: ProvinceNames = _no_names,
    fighter_stats_public: bool = True,
) -> dict | None:
    """One battle with its per-faction breakdown and, when public, its fighters."""
    record = next((r for r in records if isinstance(r, dict) and r.get("id") == record_id), None)
    if record is None:
        return None
    model = build_war_model(war_key, events, records, province_name=province_name, fighter_stats_public=False)
    battle = next((b for b in model["battles"] if b["record_id"] == record_id), None)
    fighters = record_fighters(record)

    state = model["state"]
    participants = _Participants(state)
    for fighter in fighters:
        participants.add_fighter(fighter)
    for event in events:
        if event["type"] == "battle_resolved":
            payload = public_payload("battle_resolved", event.get("payload"))
            if payload["record_id"] == record_id:
                participants.add_regiments(payload["regiments_lost"])

    started = from_epoch_ms(record.get("startedAt"))
    ended = from_epoch_ms(record.get("endedAt"))
    leaders = {side: (side_leaders(state, side)[:1] or [None])[0] for side in SIDES}
    report: dict[str, Any] = {
        "war_key": war_key,
        "war_name": model["name"],
        "war_name_raw": model["name_raw"],
        "war_status": model["status"],
        "record_id": record_id,
        "name": strip_codes(record.get("name")) or None,
        "type": _lower(record.get("type")),
        "naval": record.get("naval") is True,
        "raid": record.get("raid") is True,
        "started_at": iso(started),
        "ended_at": iso(ended),
        "duration_seconds": int((ended - started).total_seconds()) if started and ended and ended >= started else None,
        "winner": record_winner(record),
        "end_reason": _lower(record.get("endReason")),
        "battle": battle,
        "leaders": {side: _strip_ref_role(row) if row else None for side, row in leaders.items()},
        "sides": record_lives(record),
        "participants": participants.result(include_idle=False),
        "fighter_stats_public": fighter_stats_public,
    }
    if fighter_stats_public:
        def hirer_name(faction_id: str | None) -> str | None:
            if not faction_id:
                return None
            ref = participants.refs.get(faction_id)
            return ref["name"] if ref else faction_id

        report["fighters"] = sorted(
            (_public_fighter(f, hirer_name(f["hirer_id"])) for f in fighters if f["side"]),
            key=lambda f: (SIDES.index(f["side"]), -f["kills"], -f["damage"], f["name"].casefold()),
        )
    return report
