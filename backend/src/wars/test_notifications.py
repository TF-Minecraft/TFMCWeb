"""War notifications for the Discord bot (contract v1.2), against Postgres."""

from __future__ import annotations

import copy
import json
import os
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SKINS_DEV", "1")

from src import database  # noqa: E402
from src.api.map_registry import clear_map_registry_cache  # noqa: E402
from src.api.war_history_routes import war_history_router  # noqa: E402
from src.api.wars_routes import wars_router  # noqa: E402
from src.wars import history_reads, notifications  # noqa: E402
from src.wars.history_sample import ACTIVE_WAR, ENDED_WAR, sample_batches, sample_province_name  # noqa: E402

pytestmark = pytest.mark.usefixtures("postgres")

PLUGIN = {"X-Plugin-Key": "dev-plugin-key"}
STAFF = {"X-Staff-Key": "dev-staff-key"}
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
DEFENDER_ACCOUNT = "6d619517-7a3c-4bd4-8bde-70e4798acb2a"
LEFT_ACCOUNT = "7fb75149-0b11-4df9-bd03-d7256ceb1acf"
UNLINKED_ACCOUNT = "f05bedcc-0fb5-4588-a592-16cfc31f848d"


@pytest.fixture
def client(tmp_path, monkeypatch):
    registry = tmp_path / "maps.yml"
    registry.write_text(REGISTRY, encoding="utf-8")
    monkeypatch.setenv("MAP_REGISTRY_PATH", str(registry))
    for name in ("PLUGIN_KEY", "STAFF_KEY", "WAR_FIGHTER_STATS_PUBLIC", "WAR_NOTIFY_REALMS",
                 "PUBLIC_SITE_URL", "SITE_PUBLIC_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(history_reads, "province_names", lambda _map_id: sample_province_name)
    clear_map_registry_cache()
    app = FastAPI()
    app.include_router(wars_router)
    app.include_router(war_history_router)
    with TestClient(app) as test_client:
        yield test_client
    clear_map_registry_cache()


def _events(realm: str = "main") -> dict:
    return sample_batches(realm)[0]


def _battles(realm: str = "main") -> dict:
    return sample_batches(realm)[1]


def _post(client, path: str, body: dict) -> dict:
    reply = client.post(path, json=body, headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    return reply.json()


def _rows(kind: str | None = None) -> list[dict]:
    with database.connect() as conn:
        if kind is None:
            return conn.execute("SELECT * FROM war_notifications ORDER BY id").fetchall()
        return conn.execute("SELECT * FROM war_notifications WHERE kind = %s ORDER BY id", (kind,)).fetchall()


def _link(player_uuid: str, discord_user_id: str, *, left: bool = False) -> None:
    now = datetime.now(timezone.utc)
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO discord_links (player_uuid, discord_user_id, linked_at, left_guild_at) VALUES (%s, %s, %s, %s)",
            (player_uuid, discord_user_id, now, now if left else None),
        )


def _declared(events: dict, war_key: str = ACTIVE_WAR) -> dict:
    return next(e for e in events["events"] if e["type"] == "war_declared" and e["war_key"] == war_key)


# --- writing rows ------------------------------------------------------------------


def test_each_new_event_queues_its_notification_once(client):
    events = _events()
    _post(client, "/wars/plugin/events", events)
    rows = _rows()
    kinds = [row["kind"] for row in rows]
    assert kinds.count("war_declared") == 2
    assert kinds.count("ally_joined") == 2
    assert kinds.count("battle_day_set") == 1
    assert kinds.count("battle_scheduled") == 3
    assert kinds.count("battle_postponed") == 1
    assert kinds.count("battle_result") == 4
    assert kinds.count("war_ended") == 1
    assert len(rows) == len(events["events"])
    assert {row["event_id"] for row in rows} == {e["id"] for e in events["events"]}
    assert all(row["realm_id"] == "main" and row["dispatched_at"] is None and row["acked_at"] is None for row in rows)

    _post(client, "/wars/plugin/events", events)
    assert len(_rows()) == len(rows), "A resent event is already stored, so it posts nothing again"


def test_next_battle_day_is_stored_and_posts_nothing(client):
    event = copy.deepcopy(_declared(_events()))
    event.update(id="next-day-1", type="next_battle_day", at="2026-11-12T08:00:00Z",
                 payload={"battle_day": "2026-11-12"})
    assert _post(client, "/wars/plugin/events", {"realm_id": "main", "events": [event]}) == {"acked": ["next-day-1"]}
    with database.connect() as conn:
        assert conn.execute("SELECT type FROM war_events WHERE id = 'next-day-1'").fetchone()["type"] == "next_battle_day"
    assert _rows() == []


def test_war_declared_carries_everything_the_post_shows(client):
    _post(client, "/wars/plugin/events", _events())
    row = next(r for r in _rows("war_declared") if r["war_key"] == ACTIVE_WAR)
    p = row["payload"]
    assert p["war_key"] == ACTIVE_WAR
    assert p["war_name"] == "War of the Aureate Succession"
    assert p["goal"] == "de_jure_annex" and p["goal_label"] == "Annex de jure lands"
    assert p["attacker"] == {"name": "The Aureate Coterie", "rgb": "201,162,39"}
    assert p["defender"]["name"] == "House Malestroit"
    assert [m["name"] for m in p["sides"]["defender"]] == ["House Malestroit", "Vellmoor"]
    assert p["sides"]["defender"][1]["role"] == "subject"
    assert p["buildup"] is True
    assert p["day_vote_closes_at"] == "2026-11-04T18:00:00Z"
    assert p["url"] == f"https://www.tfminecraft.net/wars/{ACTIVE_WAR}"
    assert p["summary"] == "The Aureate Coterie declared war on House Malestroit."


def test_a_non_default_map_links_with_its_map_and_the_site_comes_from_the_env(client, monkeypatch):
    monkeypatch.setenv("SITE_PUBLIC_URL", "https://dev.example.test/")
    _post(client, "/wars/plugin/events", _events("dev"))
    row = _rows("war_declared")[0]
    assert row["realm_id"] == "dev"
    assert row["payload"]["url"].startswith("https://dev.example.test/wars/")
    assert row["payload"]["url"].endswith("?map=dev")
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://wars.example.test")
    assert notifications.war_url("main", "w1-2", "rec 1") == "https://wars.example.test/wars/w1-2/battles/rec%201"
    assert notifications.war_url("calavorn", "w1-2") == "https://wars.example.test/wars/w1-2?map=calavorn"


def test_only_listed_realms_get_rows(client, monkeypatch):
    monkeypatch.setenv("WAR_NOTIFY_REALMS", " Main ")
    dev_events = _events("dev")
    for event in dev_events["events"]:
        event["id"] = "dev-" + event["id"]
    _post(client, "/wars/plugin/events", dev_events)
    assert _rows() == []
    _post(client, "/wars/plugin/events", _events("main"))
    assert {row["realm_id"] for row in _rows()} == {"main"}
    monkeypatch.setenv("WAR_NOTIFY_REALMS", "")
    assert notifications.notify_realms() == set()
    monkeypatch.delenv("WAR_NOTIFY_REALMS")
    assert notifications.notify_realms() == {"main", "dev"}


def test_the_other_kinds_carry_their_fields(client):
    _post(client, "/wars/plugin/events", _events())
    joined = _rows("ally_joined")[0]["payload"]
    assert joined["faction"] == "The Jolly Sprockets"
    assert joined["side"] == "attacker" and joined["role"] == "ally" and joined["role_label"] == "Ally"
    assert joined["url"].endswith(f"/wars/{ACTIVE_WAR}")
    day = _rows("battle_day_set")[0]["payload"]
    assert day["battle_day"] == "2026-11-05" and day["quorum"] is True
    scheduled = _rows("battle_scheduled")[0]["payload"]
    assert scheduled["scheduled_at"] == "2026-11-05T20:00:00Z"
    assert scheduled["province_name"] == sample_province_name(77)
    assert scheduled["kind"] == "field" and scheduled["kind_label"] == "Field battle"
    assert _rows("battle_postponed")[0]["payload"]["battle_day"] == "2026-11-08"
    ended = _rows("war_ended")[0]["payload"]
    assert ended["war_key"] == ENDED_WAR
    assert ended["reason"] == "attacker_victory" and ended["reason_label"] == "Attacker victory"
    assert ended["winner"] == "attacker" and ended["winner_name"] == "Brume"
    assert ended["truce_until"].startswith("2025-11-13T10:00")


def test_a_battle_result_names_the_winner_and_waits_for_no_record(client):
    _post(client, "/wars/plugin/events", _events())
    results = [r["payload"] for r in _rows("battle_result") if r["war_key"] == ACTIVE_WAR]
    first = results[0]
    assert first["battle_number"] == 1
    assert first["province_name"] == sample_province_name(77)
    assert first["winner"] == "attacker" and first["winner_name"] == "The Aureate Coterie"
    assert first["winner_rgb"] == "201,162,39"
    assert first["resolution"] == "fought" and first["resolution_label"] == "Fought"
    assert first["deaths"] == {"attacker": 23, "defender": 31}
    assert first["regiments_lost"] == {"attacker": 3, "defender": 5}
    assert first["lives"] == {"attacker": {"left": 12, "max": 40}, "defender": {"left": 0, "max": 45}}
    assert first["top_fighters"] is None, "The record came after the event"
    assert first["report_url"].endswith(f"/wars/{ACTIVE_WAR}/battles/{first['record_id']}")
    autoresolved = results[2]
    assert autoresolved["resolution_label"] == "Autoresolved"
    assert autoresolved["record_id"] is None and autoresolved["report_url"] is None


def test_a_battle_result_lists_the_top_fighters_once_the_record_is_in(client, monkeypatch):
    _post(client, "/wars/plugin/battles", _battles())
    _post(client, "/wars/plugin/events", _events())
    first = next(r["payload"] for r in _rows("battle_result") if r["war_key"] == ACTIVE_WAR)
    top = first["top_fighters"]
    assert 0 < len(top) <= 3
    kills = [f["kills"] for f in top]
    assert kills == sorted(kills, reverse=True) and all(k > 0 for k in kills)
    assert set(top[0]) == {"name", "side", "faction", "kills", "deaths"}

    with database.connect() as conn:
        conn.execute("DELETE FROM war_notifications")
        conn.execute("DELETE FROM war_events")
    monkeypatch.setenv("WAR_FIGHTER_STATS_PUBLIC", "false")
    _post(client, "/wars/plugin/events", _events())
    assert all(r["payload"]["top_fighters"] is None for r in _rows("battle_result"))


def test_declared_war_dms_linked_defenders_and_keeps_their_accounts_private(client):
    _link(DEFENDER_ACCOUNT, "111")
    _link(LEFT_ACCOUNT, "222", left=True)
    event = copy.deepcopy(_declared(_events()))
    event["notify"] = {"defender_accounts": [DEFENDER_ACCOUNT.upper(), LEFT_ACCOUNT, UNLINKED_ACCOUNT,
                                             DEFENDER_ACCOUNT, 7, ""]}
    _post(client, "/wars/plugin/events", {"realm_id": "main", "events": [event]})

    dms = _rows("defender_dm")
    assert [row["payload"]["discord_user_id"] for row in dms] == ["111"]
    dm = dms[0]["payload"]
    assert dm["war_name"] == "War of the Aureate Succession"
    assert dm["attacker_name"] == "The Aureate Coterie"
    assert dm["defender_name"] == "House Malestroit"
    assert dm["url"] == f"https://www.tfminecraft.net/wars/{ACTIVE_WAR}"
    with database.connect() as conn:
        stored = conn.execute("SELECT notify FROM war_events WHERE id = %s", (event["id"],)).fetchone()["notify"]
    assert stored == event["notify"]

    page = client.get(f"/main/wars/{ACTIVE_WAR}").text + client.get("/main/wars").text
    assert DEFENDER_ACCOUNT not in page.lower() and "defender_accounts" not in page
    assert "notify" not in client.get(f"/main/wars/{ACTIVE_WAR}").json()["timeline"][0]["payload"]

    _post(client, "/wars/plugin/events", {"realm_id": "main", "events": [event]})
    assert len(_rows("defender_dm")) == 1


def test_dev_wars_send_no_dms_unless_asked(client, monkeypatch):
    _link(DEFENDER_ACCOUNT, "111")
    event = copy.deepcopy(_declared(_events("dev")))
    event["id"] = "dev-dm-" + event["id"]
    event["notify"] = {"defender_accounts": [DEFENDER_ACCOUNT]}
    _post(client, "/wars/plugin/events", {"realm_id": "dev", "events": [event]})
    assert _rows("defender_dm") == [], "Test wars on Dev never message real players by default"
    assert _rows("war_declared"), "Dev still posts in its channel"

    monkeypatch.setenv("WAR_NOTIFY_DM_REALMS", "main, dev")
    assert notifications.dm_realms() == {"main", "dev"}
    monkeypatch.setenv("WAR_NOTIFY_DM_REALMS", "")
    assert notifications.dm_realms() == set()


def test_a_malformed_notify_is_rejected_like_any_bad_field(client):
    event = copy.deepcopy(_declared(_events()))
    event["notify"] = ["not", "an", "object"]
    reply = _post(client, "/wars/plugin/events", {"realm_id": "main", "events": [event]})
    assert reply["rejected"] == [{"id": event["id"], "reason": "notify must be an object"}]
    assert notifications.defender_accounts(None) == []
    assert notifications.defender_accounts({"defender_accounts": "x"}) == []


def test_a_failing_notification_never_loses_the_event(client, monkeypatch):
    def broken(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(notifications, "build_payload", broken)
    events = _events()
    reply = _post(client, "/wars/plugin/events", events)
    assert reply == {"acked": [e["id"] for e in events["events"]]}
    assert _rows() == []
    assert client.get(f"/main/wars/{ACTIVE_WAR}").status_code == 200


def test_labels_fall_back_to_words():
    assert notifications.goal_label("raze_the_city") == "Raze the city"
    assert notifications.goal_label(None) is None
    assert notifications.kind_label("sky") == "Sky battle"
    assert notifications.kind_label(None) == "Battle"
    assert notifications.reason_label("white_peace", None) == "White peace"
    assert notifications.reason_label("admin_end", None) == "Ended by staff"
    assert notifications.reason_label("defender_victory", "defender") == "Defender victory"
    assert notifications.reason_label(None, None) == "Ended"


# --- the bot's routes -----------------------------------------------------------------


def test_routes_need_the_staff_key(client):
    assert client.get("/wars/staff/notifications").status_code == 401
    assert client.get("/wars/staff/notifications", headers={"X-Staff-Key": "wrong"}).status_code == 401
    assert client.post("/wars/staff/notifications/ack", json={"ids": [1]}).status_code == 401


def test_poll_hands_rows_out_oldest_first_once_until_they_are_offered_again(client):
    _post(client, "/wars/plugin/events", _events())
    total = len(_rows())
    first = client.get("/wars/staff/notifications", params={"limit": 5}, headers=STAFF).json()["notifications"]
    assert [n["id"] for n in first] == [row["id"] for row in _rows()[:5]]
    assert set(first[0]) == {"id", "realm_id", "war_key", "event_id", "kind", "created_at", "payload"}
    assert all(row["dispatched_at"] is not None for row in _rows()[:5])

    rest = client.get("/wars/staff/notifications", params={"limit": 200}, headers=STAFF).json()["notifications"]
    assert len(rest) == total - 5 and rest[0]["id"] > first[-1]["id"]
    assert client.get("/wars/staff/notifications", headers=STAFF).json()["notifications"] == []

    acked = client.post("/wars/staff/notifications/ack", json={"ids": [first[0]["id"], first[1]["id"], 999999]},
                        headers=STAFF).json()
    assert acked == {"acked": [first[0]["id"], first[1]["id"]]}
    with database.connect() as conn:
        conn.execute("UPDATE war_notifications SET dispatched_at = now() - interval '11 minutes'")
    again = client.get("/wars/staff/notifications", params={"limit": 200}, headers=STAFF).json()["notifications"]
    assert [n["id"] for n in again] == [row["id"] for row in _rows()[2:]], "Unacked rows come back after ten minutes"
    assert client.post("/wars/staff/notifications/ack", json={"ids": [first[0]["id"]]},
                       headers=STAFF).json() == {"acked": [first[0]["id"]]}, "Acking twice is fine"
    assert client.post("/wars/staff/notifications/ack", json={"ids": []}, headers=STAFF).json() == {"acked": []}


def test_poll_can_ask_for_some_realms_and_bounds_the_limit(client):
    _post(client, "/wars/plugin/events", _events("main"))
    dev_events = _events("dev")
    for event in dev_events["events"]:
        event["id"] = "dev-" + event["id"]
    _post(client, "/wars/plugin/events", dev_events)
    dev = client.get("/wars/staff/notifications", params={"realm": ["dev"], "limit": 200},
                     headers=STAFF).json()["notifications"]
    assert dev and {n["realm_id"] for n in dev} == {"dev"}
    both = client.get("/wars/staff/notifications", params={"realm": ["main", "dev"], "limit": 200},
                      headers=STAFF).json()["notifications"]
    assert both and {n["realm_id"] for n in both} == {"main"}
    assert client.get("/wars/staff/notifications", params={"limit": 0}, headers=STAFF).status_code == 422
    assert client.get("/wars/staff/notifications", params={"limit": 201}, headers=STAFF).status_code == 422
    assert json.dumps(notifications.pending(None, [" "])) == "[]"


def test_poll_names_its_outbox_and_a_new_database_gets_a_new_one(client):
    first = client.get("/wars/staff/notifications", headers=STAFF).json()
    assert set(first) == {"outbox_id", "notifications"}
    assert str(uuid.UUID(first["outbox_id"])) == first["outbox_id"]
    _post(client, "/wars/plugin/events", _events())
    assert client.get("/wars/staff/notifications", headers=STAFF).json()["outbox_id"] == first["outbox_id"]
    assert notifications.outbox_id() == first["outbox_id"], "The same database keeps its outbox"
    with database.connect() as conn:
        conn.execute("DELETE FROM war_notification_outbox")
    again = client.get("/wars/staff/notifications", headers=STAFF).json()["outbox_id"]
    assert again != first["outbox_id"], "A wiped outbox is a new one, so the bot starts a fresh delivered list"
    assert notifications.outbox_id() == again
    with database.connect() as conn:
        assert conn.execute("SELECT count(*) AS n FROM war_notification_outbox").fetchone()["n"] == 1
