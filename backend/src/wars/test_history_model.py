"""The war page model, built from events and battle records without a database."""

from __future__ import annotations

import json

import pytest

from src.wars.history_model import (
    build_battle_report,
    build_war_model,
    build_war_summary,
    format_instant,
    parse_instant,
    public_state,
    strip_codes,
    summarize,
)
from src.wars.history_sample import (
    ACTIVE_WAR,
    BACKFILL_WAR,
    ENDED_WAR,
    sample_batches,
    sample_province_name,
)


def _war(key: str):
    events_body, battles_body = sample_batches()
    events = [dict(e, at=parse_instant(e["at"])) for e in events_body["events"] if e["war_key"] == key]
    records = [r for r in battles_body["records"] if r["warKey"] == key]
    return events, records


def _model(key: str, **kwargs) -> dict:
    events, records = _war(key)
    return build_war_model(key, events, records, province_name=sample_province_name, **kwargs)


def _row(model: dict, name: str, side: str, mercenary: bool = False) -> dict:
    return next(p for p in model["participants"]
                if p["faction"]["name"] == name and p["side"] == side and p["mercenary"] is mercenary)


def test_active_war_score_merges_events_and_records():
    model = _model(ACTIVE_WAR)
    assert model["status"] == "active"
    assert model["started_at"] == "2026-11-02T18:00:00Z"
    assert model["ended_at"] is None and model["result"] is None
    # Two fought battles and an autoresolve; the raid counts its deaths but not as a battle won.
    assert model["score"]["battles_won"] == {"attacker": 2, "defender": 1}
    assert model["score"]["occupation"] == {"attacker": 3, "defender": 0, "route_length": 9}
    raid = next(b for b in model["battles"] if b["raid"])
    assert model["score"]["deaths"] == {
        "attacker": 23 + 38 + 9 + raid["deaths"]["attacker"],
        "defender": 31 + 19 + 14 + raid["deaths"]["defender"],
    }
    assert model["score"]["regiments_lost"] == {"attacker": 8, "defender": 8}
    assert model["objective_province_name"] == "Malestroit Keep"


def test_battles_take_event_numbers_and_record_fighters():
    model = _model(ACTIVE_WAR)
    first, second, third, raid = model["battles"]
    assert [b["battle_number"] for b in model["battles"]] == [1, 2, 3, None]
    # The event's deaths win; the record adds who fought and when.
    assert first["deaths"] == {"attacker": 23, "defender": 31}
    assert first["province_name"] == "Ashford"
    assert first["name"] == "Battle of Ashford"
    assert first["fighters"] == {"attacker": 18, "defender": 21}
    assert first["regiments_lost"] == {"attacker": 3, "defender": 5}
    assert first["started_at"] == "2026-11-05T20:02:00Z"
    assert second["winner"] == "defender" and second["kind"] == "siege"
    # No live battle: no record, no fighters, no lives.
    assert third["resolution"] == "autoresolve"
    assert third["record_id"] is None and third["fighters"] is None and third["lives"] is None
    assert raid["kind"] == "raid" and raid["province_name"] == "Fenwick" and raid["regiments_lost"] is None


def test_participants_group_by_faction_with_mercenaries_apart():
    model = _model(ACTIVE_WAR)
    sides = [(p["side"], p["role"], p["faction"]["name"]) for p in model["participants"]]
    assert sides == [
        ("attacker", "leader", "The Aureate Coterie"),
        ("attacker", "ally", "The Jolly Sprockets"),
        ("attacker", "backer", "Order of the Ash"),
        ("defender", "leader", "House Malestroit"),
        ("defender", "subject", "Vellmoor"),
        ("defender", "mercenary", "House Malestroit"),
    ]
    sprockets = _row(model, "The Jolly Sprockets", "attacker")
    assert sprockets["joined_at"] == "2026-11-03T12:00:00Z"
    assert sprockets["regiments_lost"] == 3
    mercs = _row(model, "House Malestroit", "defender", mercenary=True)
    assert mercs["fighters"] == 4 and mercs["regiments_lost"] == 0
    assert mercs["faction"]["rgb"] == "138,32,48"
    # Kills shares add up per side.
    for side in ("attacker", "defender"):
        shares = [p["share_of_side_kills"] for p in model["participants"] if p["side"] == side]
        assert sum(shares) == pytest.approx(1.0, abs=1e-3)
    # The leader's own fighters exclude the mercenaries it hired.
    _, records = _war(ACTIVE_WAR)
    own = {f["key"] for r in records for f in r["fighters"]
           if f.get("factionId") == "malestroit" and not f.get("hirerFactionId")}
    assert _row(model, "House Malestroit", "defender")["fighters"] == len(own)


def test_never_publishes_fighter_keys_or_extra_state():
    events, records = _war(ACTIVE_WAR)
    events[-1]["state"]["regiment_pool"] = {"pikemen": 40}
    events[-1]["state"]["treasury"] = 12000
    model = build_war_model(ACTIVE_WAR, events, records)
    text = json.dumps(model)
    for record in records:
        for fighter in record["fighters"]:
            assert fighter["key"] not in text
            assert fighter["key"].split("#")[0] not in text
    assert "regiment_pool" not in text and "treasury" not in text
    report = build_battle_report(ACTIVE_WAR, events, records, records[0]["id"])
    assert all("key" not in f for f in report["fighters"])
    assert records[0]["fighters"][0]["key"] not in json.dumps(report)


def test_fighter_stats_switch_hides_top_fighters_and_fighter_tables():
    events, records = _war(ACTIVE_WAR)
    hidden = build_war_model(ACTIVE_WAR, events, records, fighter_stats_public=False)
    assert "top_fighters" not in hidden and hidden["fighter_stats_public"] is False
    # Per-faction totals stay.
    assert _row(hidden, "The Aureate Coterie", "attacker")["kills"] > 0
    shown = build_war_model(ACTIVE_WAR, events, records)
    assert shown["top_fighters"]
    report = build_battle_report(ACTIVE_WAR, events, records, records[0]["id"], fighter_stats_public=False)
    assert "fighters" not in report and report["participants"]


def test_top_fighters_include_best_healers_and_sum_across_battles():
    model = _model(ACTIVE_WAR)
    top = model["top_fighters"]
    assert top == sorted(top, key=lambda f: (-f["kills"], -f["damage"], f["name"].casefold()))
    _, records = _war(ACTIVE_WAR)
    healing: dict[str, float] = {}
    for record in records:
        for fighter in record["fighters"]:
            healing[fighter["name"]] = healing.get(fighter["name"], 0) + fighter["healing"]
    best_healer = max(healing, key=healing.get)
    assert best_healer in {f["name"] for f in top}
    assert any(f["battles"] > 1 for f in top)
    mercenary = [f for f in top if f["hired_by"]]
    assert all(f["hired_by"] == "House Malestroit" for f in mercenary)


def test_timeline_reads_as_plain_sentences():
    model = _model(ACTIVE_WAR)
    lines = [entry["summary"] for entry in model["timeline"]]
    assert lines[0] == "The Aureate Coterie declared war on House Malestroit."
    assert "The Jolly Sprockets answered the call to arms and joined The Aureate Coterie." in lines
    assert "The first battle was set for 05/11/2026." in lines
    assert "A field battle was set at Ashford for 05/11/2026 21:00 CET." in lines
    assert "The battle was postponed to 08/11/2026." in lines
    assert "Battle of Ashford: victory for The Aureate Coterie. 23 attackers and 31 defenders fell." in lines
    assert any(line.startswith("Battle of Highmoor was decided without a fight") for line in lines)
    assert any(line.startswith("Raid on Fenwick: victory for House Malestroit.") for line in lines)
    assert [e["at"] for e in model["timeline"]] == sorted(e["at"] for e in model["timeline"])


@pytest.mark.parametrize("payload, expected", [
    ({"winner": "attacker", "resolution": "forfeit"},
     "Bravo could not attack at Ashford and forfeited the battle to Alpha."),
    ({"winner": "defender", "resolution": "naval_default"},
     "Alpha had no navy berthed to reach Ashford, so the battle went to Bravo."),
    ({"winner": "attacker", "resolution": "staff"}, "Staff settled the battle of Ashford in favour of Alpha."),
    ({"winner": None, "resolution": "fought"}, "Battle of Ashford: no side carried the day."),
])
def test_battle_resolutions(payload, expected):
    state = public_state({"sides": {"attacker": [{"id": "a", "name": "Alpha", "role": "leader"}],
                                    "defender": [{"id": "b", "name": "Bravo", "role": "leader"}]}})
    battle = {"province_name": "Ashford", "deaths": {"attacker": 0, "defender": 0}, **payload}
    assert summarize("battle_resolved", {}, state, battle) == expected


@pytest.mark.parametrize("payload, expected", [
    ({"reason": "white_peace", "winner": None}, "The war ended in a white peace."),
    ({"reason": "admin_end", "winner": None}, "Staff ended the war."),
    ({"reason": "defender_victory", "winner": "defender", "truce_until": "2026-12-01T10:00:00Z"},
     "The war ended in victory for the defenders. A truce holds until 01/12/2026."),
])
def test_war_ended_sentences(payload, expected):
    assert summarize("war_ended", payload, None) == expected


def test_civil_war_and_quorum_sentences():
    state = public_state({"civil_war": True, "sides": {
        "attacker": [{"id": "r", "name": "The Rebels", "role": "leader"}],
        "defender": [{"id": "c", "name": "The Crown", "role": "leader"}]}})
    assert summarize("war_declared", {}, state) == "The Rebels rose in civil war against The Crown."
    assert summarize("day_vote_closed", {"battle_day": "2026-11-19", "quorum": False}, state) == (
        "Too few voted on the day, so the first battle was set for 19/11/2026.")


def test_ended_war_result():
    model = _model(ENDED_WAR)
    assert model["status"] == "ended"
    assert model["ended_at"] == "2025-10-13T10:00:00Z"
    assert model["result"] == {"reason": "attacker_victory", "winner": "attacker",
                               "truce_until": "2025-11-13T10:00:00Z"}
    summary = build_war_summary(model)
    assert summary["sides"]["attacker"]["leaders"][0]["name"] == "Brume"
    assert summary["battles_won"] == {"attacker": 1, "defender": 0}


def test_war_known_only_from_backfilled_records():
    events, records = _war(BACKFILL_WAR)
    assert events == []
    model = build_war_model(BACKFILL_WAR, events, records)
    assert model["state"] is None and model["status"] == "ended"
    assert model["name"] == "War of the Salt Marshes"
    assert model["started_at"] == "2025-08-12T10:00:00Z"
    assert model["ended_at"] == "2025-08-17T20:10:00Z"
    assert [b["battle_number"] for b in model["battles"]] == [1, 2]
    assert model["score"]["battles_won"] == {"attacker": 1, "defender": 1}
    # No factionId: grouped by the faction's display name.
    rows = [(p["side"], p["faction"]["name"], p["faction"]["id"], p["role"]) for p in model["participants"]]
    assert rows == [("attacker", "Brume", None, None), ("defender", "Vellmoor", None, None)]
    assert [e["type"] for e in model["timeline"]] == ["battle_recorded", "battle_recorded"]
    assert model["timeline"][0]["summary"].startswith("Battle of the Salt Road: victory for Brume.")
    summary = build_war_summary(model)
    assert summary["known_from_records_only"] is True
    assert summary["sides"]["attacker"] == {"leaders": [model["participants"][0]["faction"]], "count": 1}


def test_backfilled_names_join_state_participants():
    events, records = _war(ACTIVE_WAR)
    for record in records:
        for fighter in record["fighters"]:
            for key in ("factionId", "factionFoundedAt", "hirerFactionId"):
                fighter.pop(key, None)
    model = build_war_model(ACTIVE_WAR, events, records)
    names = [(p["side"], p["faction"]["name"]) for p in model["participants"]]
    # Mercenaries without a hirer id fall under their own display name (none here: "No faction").
    assert ("attacker", "The Aureate Coterie") in names
    assert names.count(("defender", "House Malestroit")) == 1
    assert ("defender", "No faction") in names


def test_battle_report_for_one_record():
    events, records = _war(ACTIVE_WAR)
    report = build_battle_report(ACTIVE_WAR, events, records, records[1]["id"], province_name=sample_province_name)
    assert report["name"] == "Siege of Greywater"
    assert report["winner"] == "defender"
    assert report["duration_seconds"] == 71 * 60
    assert report["sides"] == {"attacker": {"left": 0, "max": 40}, "defender": {"left": 9, "max": 30}}
    assert report["battle"]["battle_number"] == 2 and report["battle"]["province_name"] == "Greywater"
    assert report["leaders"]["attacker"]["name"] == "The Aureate Coterie"
    assert sum(p["fighters"] for p in report["participants"]) == len(records[1]["fighters"])
    assert {p["regiments_lost"] for p in report["participants"] if p["faction"]["id"] == "aureate"} == {3}
    assert len(report["fighters"]) == len(records[1]["fighters"])
    assert build_battle_report(ACTIVE_WAR, events, records, "missing") is None


def test_scalars():
    assert strip_codes("§x§c§9§a§2§2§7The §lAureate") == "The Aureate"
    assert strip_codes("#c9a227The Aureate Coterie") == "The Aureate Coterie"
    assert strip_codes("§§x§3§9§a§2§2§7Gilded") == "Gilded"
    assert parse_instant("2026-11-10T09:50:00.123456789Z").isoformat() == "2026-11-10T09:50:00.123456+00:00"
    assert format_instant("2026-07-01T19:00:00Z") == "01/07/2026 21:00 CEST"
