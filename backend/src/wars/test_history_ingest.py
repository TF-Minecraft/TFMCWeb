"""War history ingest and the public war routes, against Postgres."""

from __future__ import annotations

import copy
import json
import os
from unittest import mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SKINS_DEV", "1")

from src import database  # noqa: E402
from src.api.map_access import STAFF_MAP_FORBIDDEN_DETAIL, STAFF_MAP_PERMISSION_DETAIL  # noqa: E402
from src.api.map_registry import clear_map_registry_cache  # noqa: E402
from src.api.war_history_routes import war_history_router  # noqa: E402
from src.api.wars_routes import wars_router  # noqa: E402
from src.wars import history_reads  # noqa: E402
from src.wars.history_sample import (  # noqa: E402
    ACTIVE_WAR,
    BACKFILL_WAR,
    ENDED_WAR,
    sample_batches,
    sample_province_name,
)

pytestmark = pytest.mark.usefixtures("postgres")

PLUGIN = {"X-Plugin-Key": "dev-plugin-key"}
REGISTRY = """
maps:
  - id: main
    public: true
    display_name: Adavaar
    realm_id: main
  - id: dev
    public: false
    display_name: Adavaar
    realm_id: dev
    staff_permission: tfmc.map.staff
"""


@pytest.fixture
def client(tmp_path, monkeypatch):
    registry = tmp_path / "maps.yml"
    registry.write_text(REGISTRY, encoding="utf-8")
    monkeypatch.setenv("MAP_REGISTRY_PATH", str(registry))
    monkeypatch.delenv("PLUGIN_KEY", raising=False)
    monkeypatch.delenv("WAR_FIGHTER_STATS_PUBLIC", raising=False)
    monkeypatch.setattr(history_reads, "province_names", lambda _map_id: sample_province_name)
    clear_map_registry_cache()
    app = FastAPI()
    app.include_router(wars_router)
    app.include_router(war_history_router)
    with TestClient(app) as test_client:
        yield test_client
    clear_map_registry_cache()


def _post_sample(client, realm: str = "main") -> tuple[dict, dict]:
    events, battles = sample_batches(realm)
    r1 = client.post("/wars/plugin/events", json=events, headers=PLUGIN)
    r2 = client.post("/wars/plugin/battles", json=battles, headers=PLUGIN)
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    return r1.json(), r2.json()


def _count(table: str) -> int:
    with database.connect() as conn:
        return conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()["n"]


# --- ingest ---------------------------------------------------------------------


def test_ingest_acks_every_item_and_is_idempotent(client):
    events, battles = sample_batches()
    first_events, first_battles = _post_sample(client)
    assert first_events == {"acked": [e["id"] for e in events["events"]]}
    assert first_battles == {"acked": [r["id"] for r in battles["records"]]}
    page = client.get(f"/main/wars/{ACTIVE_WAR}").json()

    again_events, again_battles = _post_sample(client)
    assert again_events == first_events and again_battles == first_battles
    assert _count("war_events") == len(events["events"])
    assert _count("war_battles") == len(battles["records"])
    assert _count("wars") == 3
    assert client.get(f"/main/wars/{ACTIVE_WAR}").json() == page


def test_resent_id_with_changed_body_is_ignored(client):
    events, _ = sample_batches()
    client.post("/wars/plugin/events", json=events, headers=PLUGIN)
    changed = copy.deepcopy(events["events"][0])
    changed["type"] = "war_ended"
    reply = client.post("/wars/plugin/events", json={"realm_id": "main", "events": [changed]}, headers=PLUGIN)
    assert reply.json() == {"acked": [changed["id"]]}
    with database.connect() as conn:
        assert conn.execute("SELECT type FROM war_events WHERE id = %s", (changed["id"],)).fetchone()["type"] != "war_ended"


def test_order_does_not_matter(client):
    events, battles = sample_batches()
    client.post("/wars/plugin/battles", json=battles, headers=PLUGIN)
    for event in reversed(events["events"]):
        client.post("/wars/plugin/events", json={"realm_id": "main", "events": [event]}, headers=PLUGIN)
    in_order = client.get(f"/main/wars/{ACTIVE_WAR}").json()
    listed = client.get("/main/wars").json()["wars"]

    with database.connect() as conn:
        for table in ("war_events", "war_battles", "wars"):
            conn.execute(f"DELETE FROM {table}")
    _post_sample(client)
    assert client.get(f"/main/wars/{ACTIVE_WAR}").json() == in_order
    assert client.get("/main/wars").json()["wars"] == listed


def test_every_event_type_is_stored(client):
    events, _ = sample_batches()
    _post_sample(client)
    with database.connect() as conn:
        types = {r["type"] for r in conn.execute("SELECT DISTINCT type FROM war_events")}
    assert types == {"war_declared", "participant_joined", "day_vote_closed", "battle_scheduled",
                     "battle_postponed", "battle_resolved", "war_ended"}
    timeline = client.get(f"/main/wars/{ENDED_WAR}").json()["timeline"]
    assert timeline[-1]["type"] == "war_ended"


def test_next_battle_day_is_stored(client):
    good = sample_batches()[0]["events"][0]
    event = {**good, "id": "e-next-day", "type": "next_battle_day", "payload": {"battle_day": "2026-11-19"}}
    reply = client.post("/wars/plugin/events", json={"realm_id": "main", "events": [event]},
                        headers=PLUGIN).json()
    assert reply["acked"] == ["e-next-day"]
    assert not reply.get("rejected")
    assert _count("war_events") == 1


def test_a_nul_character_refuses_only_its_own_item(client):
    events = sample_batches()[0]["events"]
    good, bad = events[0], {**events[1], "payload": {"battle_day": "2026-11-19\u0000"}}
    reply = client.post("/wars/plugin/events", json={"realm_id": "main", "events": [good, bad]},
                        headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    body = reply.json()
    assert set(body["acked"]) == {good["id"], bad["id"]}
    assert [r["id"] for r in body["rejected"]] == [bad["id"]]
    assert "NUL" in body["rejected"][0]["reason"]
    assert _count("war_events") == 1

    record = {**sample_batches()[1]["records"][0], "id": "r-nul", "name": "Battle of \u0000"}
    reply = client.post("/wars/plugin/battles", json={"realm_id": "main", "records": [record]}, headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    assert [r["id"] for r in reply.json()["rejected"]] == ["r-nul"]


def test_malformed_items_are_acked_and_listed(client):
    good = sample_batches()[0]["events"][0]
    bad = [
        {"id": "e-no-type", "war_key": ACTIVE_WAR, "at": "2026-11-10T09:50:00Z"},
        {"id": "e-bad-type", "war_key": ACTIVE_WAR, "type": "war_won", "at": "2026-11-10T09:50:00Z"},
        {"id": "e-bad-at", "war_key": ACTIVE_WAR, "type": "war_declared", "at": "yesterday"},
        {"id": "e-future", "war_key": ACTIVE_WAR, "type": "war_declared", "at": "2100-01-01T00:00:00Z"},
        {"id": "e-bad-key", "war_key": "../etc", "type": "war_declared", "at": "2026-11-10T09:50:00Z"},
        {"id": "e-bad-state", "war_key": ACTIVE_WAR, "type": "war_declared", "at": "2026-11-10T09:50:00Z",
         "state": [1]},
        {"war_key": ACTIVE_WAR, "type": "war_declared", "at": "2026-11-10T09:50:00Z"},
        "not an object",
    ]
    reply = client.post("/wars/plugin/events", json={"realm_id": "main", "events": [good, *bad]},
                        headers=PLUGIN).json()
    assert reply["acked"] == [good["id"], "e-no-type", "e-bad-type", "e-bad-at", "e-future", "e-bad-key",
                              "e-bad-state"]
    assert [r["id"] for r in reply["rejected"]] == ["e-no-type", "e-bad-type", "e-bad-at", "e-future",
                                                    "e-bad-key", "e-bad-state", None, None]
    assert all(r["reason"] for r in reply["rejected"])
    assert _count("war_events") == 1

    record = sample_batches()[1]["records"][0]
    bad_records = [
        {**record, "id": "r-no-end", "endedAt": None},
        {**record, "id": "r-fighters", "fighters": "many"},
        {**record, "id": "r-raid", "raid": "yes"},
        {**record, "id": "bad id with spaces"},
    ]
    reply = client.post("/wars/plugin/battles", json={"records": [record, *bad_records]}, headers=PLUGIN).json()
    # An unusable id is still acked as sent, so SF can drop that line from its outbox.
    assert reply["acked"] == [record["id"], "r-no-end", "r-fighters", "r-raid", "bad id with spaces"]
    assert [r["id"] for r in reply["rejected"]] == ["r-no-end", "r-fighters", "r-raid", "bad id with spaces"]
    assert _count("war_battles") == 1


def test_dev_campaign_clock_ahead_of_real_time_is_kept(client):
    # Staff on Dev can move the campaign clock forward; SF stamps events with it.
    event = {**sample_batches()[0]["events"][0], "id": "e-ahead", "at": "2027-06-01T20:00:00.123Z"}
    reply = client.post("/wars/plugin/events", json={"realm_id": "dev", "events": [event]}, headers=PLUGIN).json()
    assert reply == {"acked": ["e-ahead"]}


def test_records_with_omitted_nulls_are_read_as_null(client):
    # SF's Gson skips nulls, so unknown fields are absent rather than null.
    record = copy.deepcopy(sample_batches()[1]["records"][0])
    for key in ("winner", "battleId", "provinceId"):
        record.pop(key, None)
    for fighter in record["fighters"]:
        for key in ("factionId", "factionFoundedAt", "hirerFactionId", "className", "faction"):
            fighter.pop(key, None)
    reply = client.post("/wars/plugin/battles", json={"records": [record]}, headers=PLUGIN).json()
    assert reply == {"acked": [record["id"]]}
    page = client.get(f"/main/wars/{record['warKey']}").json()
    assert page["battles"][0]["winner"] is None and page["battles"][0]["province_id"] is None
    assert [p["faction"]["name"] for p in page["participants"]] == ["No faction", "No faction"]


def test_non_finite_numbers_are_rejected(client):
    record = sample_batches()[1]["records"][0]
    body = json.dumps({"records": [record]}).replace('"kills": 0', '"kills": NaN', 1)
    assert "NaN" in body
    reply = client.post("/wars/plugin/battles", content=body, headers={**PLUGIN, "Content-Type": "application/json"})
    assert reply.json()["rejected"][0]["id"] == record["id"]


@pytest.mark.parametrize("body", [
    [],
    {"events": "x"},
    {"realm_id": "Not A Realm!", "events": []},
    {"events": [{}] * 201},
])
def test_malformed_requests_are_refused(client, body):
    assert client.post("/wars/plugin/events", json=body, headers=PLUGIN).status_code == 400


def test_ingest_requires_the_plugin_key(client):
    events, battles = sample_batches()
    for path, body in (("/wars/plugin/events", events), ("/wars/plugin/battles", battles)):
        assert client.post(path, json=body).status_code == 401
        assert client.post(path, json=body, headers={"X-Plugin-Key": "wrong"}).status_code == 401
    assert _count("war_events") == 0 and _count("war_battles") == 0


def test_missing_realm_is_main_and_realms_stay_apart(client):
    events, battles = sample_batches()
    del events["realm_id"]
    client.post("/wars/plugin/events", json=events, headers=PLUGIN)
    client.post("/wars/plugin/battles", json=sample_batches("dev")[1], headers=PLUGIN)
    with database.connect() as conn:
        realms = {r["realm_id"] for r in conn.execute("SELECT realm_id FROM war_events")}
        battle_realms = {r["realm_id"] for r in conn.execute("SELECT realm_id FROM war_battles")}
    assert realms == {"main"} and battle_realms == {"dev"}
    assert client.get(f"/main/wars/{BACKFILL_WAR}").status_code == 404


def test_records_outside_a_war_are_stored_but_not_listed(client):
    record = {**sample_batches()[1]["records"][0], "id": "duel-1", "warKey": None, "warId": None}
    reply = client.post("/wars/plugin/battles", json={"records": [record]}, headers=PLUGIN).json()
    assert reply == {"acked": ["duel-1"]}
    assert _count("war_battles") == 1 and _count("wars") == 0


# --- reads ----------------------------------------------------------------------


def test_war_list_newest_first(client):
    _post_sample(client)
    wars = client.get("/main/wars").json()["wars"]
    assert [w["war_key"] for w in wars] == [ACTIVE_WAR, ENDED_WAR, BACKFILL_WAR]
    active, ended, backfill = wars
    assert active["status"] == "active" and active["battles_won"] == {"attacker": 2, "defender": 1}
    assert active["sides"]["attacker"]["leaders"][0]["name"] == "The Aureate Coterie"
    assert active["sides"]["attacker"]["count"] == 3
    assert active["phase"]["scheduled_at"] == "2026-11-12T20:00:00Z"
    assert ended["result"]["winner"] == "attacker"
    assert backfill["known_from_records_only"] is True and backfill["status"] == "ended"


def test_war_page_and_battle_report(client):
    _post_sample(client)
    page = client.get(f"/main/wars/{ACTIVE_WAR}").json()
    assert page["map_id"] == "main"
    assert page["battles"][0]["province_name"] == "Ashford"
    assert page["top_fighters"]
    record_id = page["battles"][0]["record_id"]
    report = client.get(f"/main/wars/{ACTIVE_WAR}/battles/{record_id}").json()
    assert report["name"] == "Battle of Ashford" and report["fighters"]
    assert client.get(f"/main/wars/{ACTIVE_WAR}/battles/nope").status_code == 404
    assert client.get(f"/main/wars/{ENDED_WAR}/battles/{record_id}").status_code == 404
    assert client.get("/main/wars/w9-1").status_code == 404
    backfill = client.get(f"/main/wars/{BACKFILL_WAR}").json()
    assert backfill["state"] is None and len(backfill["battles"]) == 2


def test_no_fighter_keys_in_public_replies(client):
    _, battles = sample_batches()
    _post_sample(client)
    page = client.get(f"/main/wars/{ACTIVE_WAR}").text
    listed = client.get("/main/wars").text
    report = client.get(f"/main/wars/{ACTIVE_WAR}/battles/{battles['records'][1]['id']}").text
    for record in battles["records"]:
        for fighter in record["fighters"]:
            uuid = fighter["key"].split("#")[0]
            assert uuid not in page and uuid not in listed and uuid not in report


def test_fighter_stats_switch(client, monkeypatch):
    _, battles = sample_batches()
    _post_sample(client)
    record_id = battles["records"][1]["id"]
    monkeypatch.setenv("WAR_FIGHTER_STATS_PUBLIC", "false")
    page = client.get(f"/main/wars/{ACTIVE_WAR}").json()
    report = client.get(f"/main/wars/{ACTIVE_WAR}/battles/{record_id}").json()
    assert "top_fighters" not in page and page["fighter_stats_public"] is False
    assert "fighters" not in report and report["participants"]
    monkeypatch.setenv("WAR_FIGHTER_STATS_PUBLIC", "true")
    assert client.get(f"/main/wars/{ACTIVE_WAR}").json()["top_fighters"]


def test_staff_map_needs_access(client):
    _post_sample(client, realm="dev")
    for path in ("/dev/wars", f"/dev/wars/{ACTIVE_WAR}"):
        reply = client.get(path)
        assert reply.status_code == 403 and reply.json()["detail"] == STAFF_MAP_FORBIDDEN_DETAIL
    session = {"scope": "profile", "player_uuid": "p", "realm_id": "main"}
    with mock.patch("src.api.map_access.get_character_session", return_value=session), \
            mock.patch("src.api.map_access.has_map_staff_access", return_value=False):
        reply = client.get("/dev/wars", headers={"Authorization": "Bearer t"})
        assert reply.status_code == 403 and reply.json()["detail"] == STAFF_MAP_PERMISSION_DETAIL
    with mock.patch("src.api.map_access.get_character_session", return_value=session), \
            mock.patch("src.api.map_access.has_map_staff_access", return_value=True):
        wars = client.get("/dev/wars", headers={"Authorization": "Bearer t"}).json()["wars"]
    assert len(wars) == 3
    # The public map reads its own realm only.
    assert client.get("/main/wars").json()["wars"] == []
    assert client.get("/nomap/wars").status_code == 404


def test_province_names_come_from_map_markers(tmp_path, monkeypatch):
    from src.scripts.loader import markers

    (tmp_path / "main").mkdir()
    path = tmp_path / "main" / "map_markers.json"
    path.write_text(json.dumps({"settlements": [{"province_id": 77, "name": "Ashford"},
                                                {"province_id": 80, "name": "§x§a§3§a§1§8§4Standfast"}],
                                "installations": [{"id": "i1", "province_id": 78, "name": "Greywater Mine"}]}))
    lookup = lambda map_id, name: str(tmp_path / map_id / name)  # noqa: E731
    monkeypatch.setattr(history_reads, "input_file", lookup)
    monkeypatch.setattr(markers, "input_file", lookup)
    history_reads.clear_province_names_cache()
    names = history_reads.province_names("main")
    assert (names(77), names(78), names(79)) == ("Ashford", "Greywater Mine", None)
    # Coloured settlement names lose their codes.
    assert names(80) == "Standfast"
    assert history_reads.province_names("dev")(77) is None
