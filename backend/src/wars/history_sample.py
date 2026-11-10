"""A realistic sample war in the SimpleFactions wire format, for tests and local previews.

`sample_batches()` returns the bodies SF would POST to `/wars/plugin/events` and
`/wars/plugin/battles`: one war in progress (three battles and a raid), one that
ended, and one known only from backfilled battle records (no events, no
`factionId`). Deterministic, so tests can assert on its numbers.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

AUREATE = {"id": "aureate", "founded_at": 1730000000, "name": "The Aureate Coterie",
           "name_raw": "#c9a227The Aureate Coterie", "rgb": "201,162,39"}
SPROCKETS = {"id": "sprockets", "founded_at": 1731000000, "name": "The Jolly Sprockets",
             "name_raw": "§bThe Jolly Sprockets", "rgb": "70,130,180"}
ASH = {"id": "ash", "founded_at": 1732000000, "name": "Order of the Ash",
       "name_raw": "§7Order of the Ash", "rgb": "150,150,140"}
MALESTROIT = {"id": "malestroit", "founded_at": 1729000000, "name": "House Malestroit",
              "name_raw": "#8a2030House Malestroit", "rgb": "138,32,48"}
VELLMOOR = {"id": "vellmoor", "founded_at": 1733000000, "name": "Vellmoor",
            "name_raw": "§2Vellmoor", "rgb": "90,120,60"}
BRUME = {"id": "brume", "founded_at": 1734000000, "name": "Brume", "name_raw": "§9Brume", "rgb": "95,50,217"}
KESTREL = {"id": "kestrel", "founded_at": 1734500000, "name": "Kestrel Reach",
           "name_raw": "§6Kestrel Reach", "rgb": "200,110,40"}

PROVINCES = {77: "Ashford", 78: "Greywater", 79: "Highmoor", 80: "Malestroit Keep", 81: "Fenwick"}

ACTIVE_WAR = "w3-1793642400"
ENDED_WAR = "w1-1760000000"
BACKFILL_WAR = "w2-1754992800"

_NAMES = [
    "Aldric", "Brannoc", "Caelin", "Dorran", "Edda", "Fenna", "Garrick", "Hollis", "Isolde", "Jorund",
    "Kestra", "Lorcan", "Maelis", "Niamh", "Osric", "Perrin", "Quill", "Rowena", "Sigrun", "Tamsin",
    "Ulric", "Vesna", "Wystan", "Ysolde", "Zorya", "Anselm", "Briar", "Corwin", "Delphine", "Emeric",
    "Faolan", "Gwenna", "Hale", "Ivo", "Jessamy", "Kael", "Linnea", "Merrick", "Nessa", "Orrin",
]
# The same characters fight a war's battles: (faction id, hirer id) -> [(key, name)].
_POOLS: dict[tuple, list[tuple[str, str]]] = {}
_CLASSES = ["Knight", "Ranger", "Cleric", "Berserker", "Arbalist", "Warden"]


def _ms(value: str) -> int:
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)


def _participant(ref: dict, role: str, joined_at: str | None = None) -> dict:
    return {**ref, "role": role, "joined_at": joined_at}


def _state(**overrides) -> dict:
    state = {
        "name": "War of the Aureate Succession",
        "name_raw": "#c9a227War of the Aureate Succession",
        "goal": "de_jure_annex",
        "war_type": "conquest",
        "civil_war": False,
        "status": "active",
        "schedule_phase": "buildup",
        "campaign_phase": "invasion",
        "buildup": True,
        "day_vote_closes_at": "2026-11-04T18:00:00Z",
        "battle_day": None,
        "scheduled_at": None,
        "route_length": 9,
        "objective_province_id": 80,
        "objective_held_by": "defender",
        "occupied_by_attacker": 0,
        "occupied_by_defender": 0,
        "battles_fought": 0,
        "initiative": {"attacker": 6, "defender": 4, "holder": "attacker"},
        "sides": {
            "attacker": [_participant(AUREATE, "leader")],
            "defender": [_participant(MALESTROIT, "leader"), _participant(VELLMOOR, "subject")],
        },
    }
    state.update(overrides)
    return state


def _event(rng: random.Random, war_key: str, event_type: str, at: str, state: dict, payload: dict | None = None) -> dict:
    return {
        "id": str(uuid.UUID(int=rng.getrandbits(128), version=4)),
        "war_key": war_key,
        "type": event_type,
        "at": at,
        "state": state,
        "payload": payload or {},
    }


def _fighters(rng: random.Random, roster: list[tuple[str, dict | None, dict | None, int]], *,
              backfill: bool = False) -> list[dict]:
    """roster: (battle side id, own faction ref, hirer ref, count)."""
    fighters = []
    for side_id, faction, hirer, count in roster:
        pool_key = ((faction or {}).get("id"), (hirer or {}).get("id"))
        pool = _POOLS.setdefault(pool_key, [])
        while len(pool) < count:
            index = rng.randrange(len(_NAMES))
            pool.append((f"{uuid.UUID(int=rng.getrandbits(128), version=4)}#{rng.randrange(1, 4)}",
                         f"{_NAMES[index]} {chr(65 + rng.randrange(26))}."))
        for key, name in rng.sample(pool, count):
            fighter = {
                "key": key,
                "name": name,
                "side": side_id,
                "faction": faction["name"] if faction else None,
                "className": rng.choice(_CLASSES),
                "kills": rng.randrange(0, 6),
                "deaths": rng.randrange(0, 4),
                "assists": rng.randrange(0, 5),
                "teamKills": 1 if rng.random() < 0.05 else 0,
                "logouts": 0,
                "blockedHits": rng.randrange(0, 8),
                "damage": round(rng.uniform(40, 420), 1),
                "friendlyDamage": round(rng.uniform(0, 12), 1),
                "damageTaken": round(rng.uniform(60, 380), 1),
                "healing": round(rng.uniform(0, 260), 1) if rng.random() < 0.3 else 0.0,
                "selfHealing": round(rng.uniform(0, 60), 1),
                "cc": round(rng.uniform(0, 18), 1),
                "ccTaken": round(rng.uniform(0, 18), 1),
                "friendlyCc": 0.0,
            }
            if not backfill:
                fighter["factionId"] = faction["id"] if faction else None
                fighter["factionFoundedAt"] = faction["founded_at"] if faction else None
                fighter["hirerFactionId"] = hirer["id"] if hirer else None
            fighters.append(fighter)
    return fighters


def _record(rng: random.Random, *, record_id: str, battle_id: str, name: str, war_key: str, war_name: str,
            started: str, ended: str, winner: str | None, roster, province_id: int | None,
            battle_type: str = "FIELD", raid: bool = False, lives=((12, 40), (0, 45)),
            backfill: bool = False) -> dict:
    record = {
        "id": record_id,
        "battleId": battle_id,
        "name": name,
        "type": battle_type,
        "naval": False,
        "raid": raid,
        "warId": int(war_key[1:].split("-")[0]),
        "warKey": war_key,
        "warName": war_name,
        "startedAt": _ms(started),
        "endedAt": _ms(ended),
        "winner": winner,
        "endReason": "lives",
        "sides": [
            {"id": "attackers", "warRole": "ATTACKER", "lives": lives[0][0], "maxLives": lives[0][1]},
            {"id": "defenders", "warRole": "DEFENDER", "lives": lives[1][0], "maxLives": lives[1][1]},
        ],
        "fighters": _fighters(rng, roster, backfill=backfill),
    }
    if not backfill:
        record["provinceId"] = province_id
    return record


def _lost(ref: dict, side: str, regiment: str, regiment_name: str, count: int) -> dict:
    return {"faction": ref, "side": side, "regiment": regiment, "regiment_name": regiment_name, "count": count}


def _active_war(rng: random.Random) -> tuple[list[dict], list[dict]]:
    key = ACTIVE_WAR
    name = "War of the Aureate Succession"
    joined_sprockets = "2026-11-03T12:00:00Z"
    attackers_2 = [_participant(AUREATE, "leader"), _participant(SPROCKETS, "ally", joined_sprockets)]
    attackers_3 = attackers_2 + [_participant(ASH, "backer", "2026-11-06T09:00:00Z")]
    defenders = [_participant(MALESTROIT, "leader"), _participant(VELLMOOR, "subject")]

    def sides(attackers):
        return {"attacker": attackers, "defender": defenders}

    events = [
        _event(rng, key, "war_declared", "2026-11-02T18:00:00Z", _state()),
        _event(rng, key, "participant_joined", joined_sprockets, _state(sides=sides(attackers_2)),
               {"faction": SPROCKETS, "side": "attacker", "role": "ally"}),
        _event(rng, key, "day_vote_closed", "2026-11-04T18:00:00Z",
               _state(sides=sides(attackers_2), battle_day="2026-11-05"),
               {"battle_day": "2026-11-05", "quorum": True}),
        _event(rng, key, "battle_scheduled", "2026-11-04T18:05:00Z",
               _state(sides=sides(attackers_2), battle_day="2026-11-05", scheduled_at="2026-11-05T20:00:00Z",
                      schedule_phase="scheduled"),
               {"scheduled_at": "2026-11-05T20:00:00Z", "province_id": 77, "kind": "field"}),
    ]
    r1 = "w3-field-77-" + str(_ms("2026-11-05T21:04:00Z"))
    events.append(_event(rng, key, "battle_resolved", "2026-11-05T21:05:00Z",
                         _state(sides=sides(attackers_2), buildup=False, schedule_phase="resolved",
                                occupied_by_attacker=1, battles_fought=1),
                         {"battle_number": 1, "province_id": 77, "kind": "field", "leg": "invasion",
                          "winner": "attacker", "resolution": "fought", "battle_id": "w3-field-77",
                          "record_id": r1, "deaths": {"attacker": 23, "defender": 31},
                          "lives": {"attacker": {"left": 12, "max": 40}, "defender": {"left": 0, "max": 45}},
                          "regiments_lost": [
                              _lost(AUREATE, "attacker", "men_at_arms", "Men-at-Arms", 2),
                              _lost(SPROCKETS, "attacker", "crossbowmen", "Crossbowmen", 1),
                              _lost(MALESTROIT, "defender", "pikemen", "Pikemen", 3),
                              _lost(VELLMOOR, "defender", "levy", "Levy Spearmen", 2),
                          ]}))
    events.append(_event(rng, key, "participant_joined", "2026-11-06T09:00:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=1, battles_fought=1),
                         {"faction": ASH, "side": "attacker", "role": "backer"}))
    events.append(_event(rng, key, "battle_scheduled", "2026-11-06T09:30:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=1, battles_fought=1,
                                scheduled_at="2026-11-07T20:00:00Z", schedule_phase="scheduled"),
                         {"scheduled_at": "2026-11-07T20:00:00Z", "province_id": 78, "kind": "siege"}))
    events.append(_event(rng, key, "battle_postponed", "2026-11-07T12:00:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=1, battles_fought=1,
                                battle_day="2026-11-08", scheduled_at="2026-11-08T20:00:00Z"),
                         {"battle_day": "2026-11-08"}))
    r2 = "w3-siege-78-" + str(_ms("2026-11-08T21:12:00Z"))
    events.append(_event(rng, key, "battle_resolved", "2026-11-08T21:13:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=1, battles_fought=2,
                                schedule_phase="resolved"),
                         {"battle_number": 2, "province_id": 78, "kind": "siege", "leg": "invasion",
                          "winner": "defender", "resolution": "fought", "battle_id": "w3-siege-78",
                          "record_id": r2, "deaths": {"attacker": 38, "defender": 19},
                          "lives": {"attacker": {"left": 0, "max": 40}, "defender": {"left": 9, "max": 30}},
                          "regiments_lost": [
                              _lost(AUREATE, "attacker", "men_at_arms", "Men-at-Arms", 3),
                              _lost(SPROCKETS, "attacker", "crossbowmen", "Crossbowmen", 2),
                              _lost(MALESTROIT, "defender", "pikemen", "Pikemen", 1),
                          ]}))
    events.append(_event(rng, key, "battle_resolved", "2026-11-09T20:30:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=3, battles_fought=3,
                                schedule_phase="resolved"),
                         {"battle_number": 3, "province_id": 79, "kind": "field", "leg": "invasion",
                          "winner": "attacker", "resolution": "autoresolve", "battle_id": None,
                          "record_id": None, "deaths": {"attacker": 9, "defender": 14}, "lives": None,
                          "regiments_lost": [_lost(VELLMOOR, "defender", "levy", "Levy Spearmen", 2)]}))
    events.append(_event(rng, key, "battle_scheduled", "2026-11-10T09:00:00Z",
                         _state(sides=sides(attackers_3), buildup=False, occupied_by_attacker=3, battles_fought=3,
                                scheduled_at="2026-11-12T20:00:00Z", schedule_phase="scheduled"),
                         {"scheduled_at": "2026-11-12T20:00:00Z", "province_id": 80, "kind": "siege"}))

    records = [
        _record(rng, record_id=r1, battle_id="w3-field-77", name="Battle of Ashford", war_key=key, war_name=name,
                started="2026-11-05T20:02:00Z", ended="2026-11-05T21:04:00Z", winner="attackers", province_id=77,
                roster=[("attackers", AUREATE, None, 12), ("attackers", SPROCKETS, None, 6),
                        ("defenders", MALESTROIT, None, 13), ("defenders", VELLMOOR, None, 5),
                        ("defenders", None, MALESTROIT, 3)]),
        _record(rng, record_id=r2, battle_id="w3-siege-78", name="Siege of Greywater", war_key=key, war_name=name,
                started="2026-11-08T20:01:00Z", ended="2026-11-08T21:12:00Z", winner="defenders", province_id=78,
                battle_type="SIEGE", lives=((0, 40), (9, 30)),
                roster=[("attackers", AUREATE, None, 14), ("attackers", SPROCKETS, None, 5),
                        ("attackers", ASH, None, 2), ("defenders", MALESTROIT, None, 12),
                        ("defenders", VELLMOOR, None, 4), ("defenders", None, MALESTROIT, 4)]),
        _record(rng, record_id="w3-raid-81-" + str(_ms("2026-11-09T22:40:00Z")), battle_id="w3-raid-81",
                name="Raid on Fenwick", war_key=key, war_name=name, started="2026-11-09T22:20:00Z",
                ended="2026-11-09T22:40:00Z", winner="defenders", province_id=81, battle_type="RAID", raid=True,
                lives=((0, 10), (4, 10)),
                roster=[("attackers", SPROCKETS, None, 4), ("defenders", VELLMOOR, None, 5)]),
    ]
    return events, records


def _ended_war(rng: random.Random) -> tuple[list[dict], list[dict]]:
    key = ENDED_WAR
    name = "The Brume Border War"
    sides = {"attacker": [_participant(BRUME, "leader")], "defender": [_participant(KESTREL, "leader")]}
    base = dict(name=name, name_raw="§9The Brume Border War", goal="tributary", sides=sides, route_length=4,
                objective_province_id=81, buildup=False, schedule_phase="resolved")
    record_id = "w1-field-81-" + str(_ms("2025-10-12T21:00:00Z"))
    events = [
        _event(rng, key, "war_declared", "2025-10-09T08:53:20Z", _state(**base, day_vote_closes_at=None)),
        _event(rng, key, "battle_resolved", "2025-10-12T21:01:00Z",
               _state(**base, occupied_by_attacker=4, battles_fought=1),
               {"battle_number": 1, "province_id": 81, "kind": "field", "leg": "invasion", "winner": "attacker",
                "resolution": "fought", "battle_id": "w1-field-81", "record_id": record_id,
                "deaths": {"attacker": 11, "defender": 17},
                "lives": {"attacker": {"left": 7, "max": 25}, "defender": {"left": 0, "max": 25}},
                "regiments_lost": [_lost(KESTREL, "defender", "archers", "Archers", 2)]}),
        _event(rng, key, "war_ended", "2025-10-13T10:00:00Z",
               _state(**base, status="ended", occupied_by_attacker=4, battles_fought=1),
               {"reason": "attacker_victory", "winner": "attacker", "truce_until": "2025-11-13T10:00:00Z"}),
    ]
    records = [_record(rng, record_id=record_id, battle_id="w1-field-81", name="Battle of Fenwick", war_key=key,
                       war_name=name, started="2025-10-12T20:05:00Z", ended="2025-10-12T21:00:00Z",
                       winner="attackers", province_id=81, lives=((7, 25), (0, 25)),
                       roster=[("attackers", BRUME, None, 9), ("defenders", KESTREL, None, 10)])]
    return events, records


def _backfill_war(rng: random.Random) -> list[dict]:
    key = BACKFILL_WAR
    name = "War of the Salt Marshes"
    return [
        _record(rng, record_id=f"w2-field-{i}-{_ms(ended)}", battle_id=f"w2-field-{i}", name=title,
                war_key=key, war_name=name, started=started, ended=ended, winner=winner, province_id=None,
                backfill=True, roster=[("attackers", BRUME, None, 8), ("defenders", VELLMOOR, None, 7)])
        for i, (title, started, ended, winner) in enumerate([
            ("Battle of the Salt Road", "2025-08-14T19:00:00Z", "2025-08-14T19:50:00Z", "attackers"),
            ("Battle of Reedmere", "2025-08-17T19:00:00Z", "2025-08-17T20:10:00Z", "defenders"),
        ], start=1)
    ]


def sample_batches(realm_id: str = "main") -> tuple[dict, dict]:
    """(events body, battles body) as SimpleFactions would post them."""
    rng = random.Random(20261110)
    _POOLS.clear()
    active_events, active_records = _active_war(rng)
    ended_events, ended_records = _ended_war(rng)
    backfill_records = _backfill_war(rng)
    return (
        {"realm_id": realm_id, "events": ended_events + active_events},
        {"realm_id": realm_id, "records": ended_records + active_records + backfill_records},
    )


def sample_province_name(province_id: int) -> str | None:
    return PROVINCES.get(province_id)


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
