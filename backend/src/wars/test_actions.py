"""War actions (contract v1.3): private vote state, /me, votes, call to arms answers, the plugin's
poll and the bot's routes, against Postgres."""

from __future__ import annotations

import json
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SKINS_DEV", "1")

from src import database  # noqa: E402
from src.api.map_registry import clear_map_registry_cache  # noqa: E402
from src.api.war_history_routes import war_history_router  # noqa: E402
from src.api.wars_routes import wars_router  # noqa: E402
from src.auth import users  # noqa: E402
from src.wars import actions, history_reads  # noqa: E402
from src.wars.history_model import faction_ref  # noqa: E402
from src.wars.history_sample import (  # noqa: E402
    AUREATE,
    MALESTROIT,
    SPROCKETS,
    VELLMOOR,
    _participant,
    _state,
    sample_province_name,
)

pytestmark = pytest.mark.usefixtures("postgres")

PLUGIN = {"X-Plugin-Key": "dev-plugin-key"}
STAFF = {"X-Staff-Key": "dev-staff-key"}
SITE = "https://site.example"
ORIGIN = {"Origin": SITE}
COOKIE = "__Host-tfmc_session"
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
WAR = "w7-1793642400"
ATTACKER = "6d619517-7a3c-4bd4-8bde-70e4798acb2a"
DEFENDER = "7fb75149-0b11-4df9-bd03-d7256ceb1acf"
OUTSIDER = "f05bedcc-0fb5-4588-a592-16cfc31f848d"
LEADER = "0b7f7f8e-6a55-4e0c-9a77-3c1b0e3f6c11"
DISCORD = {ATTACKER: "100000000000000001", DEFENDER: "100000000000000002", OUTSIDER: "100000000000000003",
           LEADER: "100000000000000004"}
UNLINKED_DISCORD = "100000000000000009"
DAYS = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]
LABELS = ["Tue 17/11", "Wed 18/11", "Thu 19/11", "Fri 20/11", "Sat 21/11"]
OPEN_UNTIL = "2099-01-01T00:00:00Z"


@pytest.fixture
def client(tmp_path, monkeypatch):
    registry = tmp_path / "maps.yml"
    registry.write_text(REGISTRY, encoding="utf-8")
    monkeypatch.setenv("MAP_REGISTRY_PATH", str(registry))
    for name in ("PLUGIN_KEY", "STAFF_KEY", "WAR_FIGHTER_STATS_PUBLIC", "WAR_NOTIFY_REALMS", "WAR_NOTIFY_DM_REALMS",
                 "PUBLIC_SITE_URL", "PS_PRODUCTION", "SIGN_IN_SITE"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("DISCORD_AUTH_ENABLED", "1")
    monkeypatch.setenv("DISCORD_CLIENT_ID", "client-id")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("DISCORD_GUILD_ID", "999999999999999999")
    monkeypatch.setenv("DISCORD_REDIRECT_URI", SITE + "/api/auth/discord/callback")
    monkeypatch.setenv("SITE_PUBLIC_URL", SITE)
    monkeypatch.setattr(history_reads, "province_names", lambda _map_id: sample_province_name)
    clear_map_registry_cache()
    app = FastAPI()
    app.include_router(wars_router)
    app.include_router(war_history_router)
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client
    clear_map_registry_cache()


# --- helpers ------------------------------------------------------------------------------

_counter = iter(range(1, 1_000_000))


def _sides() -> dict:
    return {
        "attacker": [_participant(AUREATE, "leader")],
        "defender": [_participant(MALESTROIT, "leader"), _participant(VELLMOOR, "subject")],
    }


def _voting(kind="day", *, options=None, labels=None, closes_at=OPEN_UNTIL, votes=None, tally=None) -> dict:
    if kind is None:
        return {"kind": None, "options": [], "option_labels": [], "closes_at": None,
                "eligible": {ATTACKER: "attacker", DEFENDER: "defender"}, "votes": {}, "tally": []}
    options = DAYS if options is None else options
    return {
        "kind": kind,
        "options": options,
        "option_labels": LABELS if labels is None and kind == "day" else (labels or [f"{o}:00 CET" for o in options]),
        "closes_at": closes_at,
        "eligible": {ATTACKER: "attacker", DEFENDER.upper(): "defender"},
        "votes": votes if votes is not None else {ATTACKER: [options[1]], DEFENDER: [options[1], options[2]]},
        "tally": tally if tally is not None else [
            {"option": o, "attacker": 1 if i == 1 else 0, "defender": 1 if i in (1, 2) else 0}
            for i, o in enumerate(options)
        ],
    }


def _event(event_type: str, at: str, *, payload=None, private=None, war_key=WAR, **extra) -> dict:
    event = {
        "id": f"ev-{next(_counter)}",
        "war_key": war_key,
        "type": event_type,
        "at": at,
        "state": _state(name="War of the Seven Days", name_raw="War of the Seven Days", sides=_sides()),
        "payload": payload or {},
    }
    if private is not None:
        event["private"] = private
    event.update(extra)
    return event


def _post_events(client, events: list[dict], realm: str = "main") -> dict:
    reply = client.post("/wars/plugin/events", json={"realm_id": realm, "events": events}, headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    return reply.json()


def _declare(client, voting=None, realm: str = "main") -> None:
    _post_events(client, [_event("war_declared", "2026-11-10T09:50:00Z",
                                 notify={"defender_accounts": [DEFENDER]},
                                 private={"voting": voting if voting is not None else _voting()})], realm)


def _link(account: str, discord_user_id: str | None = None) -> None:
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO discord_links (player_uuid, discord_user_id, linked_at) VALUES (%s, %s, now())",
            (account, discord_user_id or DISCORD[account]),
        )


def _sign_in(client, discord_user_id: str) -> None:
    token = users.sign_in(
        {"discord_user_id": discord_user_id, "discord_username": "player", "discord_global_name": None,
         "discord_avatar": None},
        guild_member=True,
    )
    client.cookies.set(COOKIE, token)


def _me(client, war_key: str = WAR, map_name: str = "main") -> dict:
    reply = client.get(f"/{map_name}/wars/{war_key}/me")
    assert reply.status_code == 200, reply.text
    assert reply.headers["cache-control"] == "no-store"
    return reply.json()


def _vote(client, picks, kind="day", headers=ORIGIN):
    return client.post(f"/main/wars/{WAR}/vote", json={"kind": kind, "picks": picks}, headers=headers)


def _pending(client, realm="main") -> list[dict]:
    reply = client.get("/wars/plugin/actions/pending", params={"realm": realm}, headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    return reply.json()["actions"]


def _applied(client, results: list[dict]) -> dict:
    reply = client.post("/wars/plugin/actions/applied", json={"results": results}, headers=PLUGIN)
    assert reply.status_code == 200, reply.text
    return reply.json()


def _actions() -> list[dict]:
    with database.connect() as conn:
        return conn.execute("SELECT * FROM war_actions ORDER BY id").fetchall()


def _sql(statement: str, params: tuple = ()) -> None:
    with database.connect() as conn:
        conn.execute(statement, params)


def _call_sent(target=SPROCKETS, *, leader=LEADER, at="2026-11-10T10:00:00Z") -> dict:
    return _event("call_to_arms_sent", at,
                  payload={"caller": AUREATE, "target": target, "side": "attacker", "coalition": False},
                  private={"notify": {"leader_account": leader, "leader_character_id": "char-1"}})


# --- private data: stored, never published -----------------------------------------------


def test_private_is_stored_and_kept_out_of_every_public_reply(client):
    _declare(client)
    _post_events(client, [_event("votes_changed", "2026-11-10T10:00:00Z", private={"voting": _voting()}),
                          _call_sent()])
    with database.connect() as conn:
        stored = conn.execute("SELECT type, private FROM war_events ORDER BY at").fetchall()
        war = conn.execute("SELECT private FROM wars WHERE war_key = %s", (WAR,)).fetchone()
    assert stored[0]["private"]["voting"]["kind"] == "day"
    assert war["private"]["voting"]["eligible"][ATTACKER] == "attacker"

    public = [client.get("/main/wars").text, client.get(f"/main/wars/{WAR}").text]
    for text in public + [json.dumps(_me(client))]:
        for secret in (ATTACKER, DEFENDER, LEADER, "char-1", "leader_account", "notify", "private", "votes"):
            assert secret not in text.lower()
    for text in public:
        assert "eligible" not in text and "tally" not in text
    page = client.get(f"/main/wars/{WAR}").json()
    assert [entry["type"] for entry in page["timeline"]] == ["war_declared"], "Silent events have no timeline entry"


def test_silent_events_post_nothing_to_the_channel(client):
    _declare(client)
    _post_events(client, [
        _event("votes_changed", "2026-11-10T10:00:00Z", private={"voting": _voting()}),
        _event("call_to_arms_closed", "2026-11-10T10:01:00Z", payload={"target": SPROCKETS, "result": "declined"}),
    ])
    with database.connect() as conn:
        kinds = [row["kind"] for row in conn.execute("SELECT kind FROM war_notifications").fetchall()]
    assert kinds == ["war_declared"]


def test_the_newest_private_vote_wins_whatever_order_it_arrives_in(client):
    _declare(client)
    newer = _voting(votes={ATTACKER: ["2026-11-21"]})
    older = _voting(votes={ATTACKER: ["2026-11-17"]})
    _post_events(client, [_event("votes_changed", "2026-11-10T12:00:00Z", private={"voting": newer})])
    _post_events(client, [_event("votes_changed", "2026-11-10T11:00:00Z", private={"voting": older})])
    # An event without a voting block (a call to arms) does not touch the vote.
    _post_events(client, [_call_sent(at="2026-11-10T13:00:00Z")])
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    assert _me(client)["picks"] == ["2026-11-21"]


def test_the_page_model_reads_only_the_newest_votes_changed(client):
    _declare(client)
    events = []
    for minute in range(5):
        event = _event("votes_changed", f"2026-11-10T10:0{minute}:00Z", private={"voting": _voting()})
        event["state"]["battles_fought"] = minute
        events.append(event)
    _post_events(client, events)
    with database.connect() as conn:
        from src.wars.history_ingest import load_events

        loaded = load_events(conn, "main", WAR)
    assert [e["type"] for e in loaded] == ["war_declared", "votes_changed"]
    assert loaded[1]["state"]["battles_fought"] == 4
    assert client.get(f"/main/wars/{WAR}").json()["state"]["battles_fought"] == 4


def test_a_private_block_that_is_not_an_object_is_rejected(client):
    reply = _post_events(client, [_event("votes_changed", "2026-11-10T10:00:00Z", private=["no"])])
    assert reply["rejected"][0]["reason"] == "private must be an object"


# --- /me ---------------------------------------------------------------------------------


def test_signed_out_users_see_only_that_a_vote_is_open(client):
    _declare(client)
    me = _me(client)
    assert me == {
        "signed_in": False, "linked": False, "eligible": False, "side": None,
        "vote": {"kind": "day", "closes_at": OPEN_UNTIL}, "picks": None, "tally": None,
        "actions": {"call_to_arms_answer": None, "day_vote": None, "hour_vote": None},
        "calls_to_arms": [],
    }


def test_an_unlinked_or_ineligible_user_gets_no_tally(client):
    _declare(client)
    _sign_in(client, UNLINKED_DISCORD)
    me = _me(client)
    assert me["signed_in"] is True and me["linked"] is False and me["tally"] is None

    _link(OUTSIDER)
    _sign_in(client, DISCORD[OUTSIDER])
    me = _me(client)
    assert me["linked"] is True and me["eligible"] is False
    assert me["vote"] == {"kind": "day", "closes_at": OPEN_UNTIL}
    assert me["tally"] is None and me["picks"] is None


def test_an_eligible_user_sees_options_their_picks_and_the_tally(client):
    _declare(client)
    _link(DEFENDER)
    _sign_in(client, DISCORD[DEFENDER])
    me = _me(client)
    assert me["eligible"] is True and me["side"] == "defender", "Eligibility matches whatever the UUID's case"
    assert me["vote"] == {"kind": "day", "options": DAYS, "option_labels": LABELS, "closes_at": OPEN_UNTIL}
    assert me["picks"] == ["2026-11-18", "2026-11-19"]
    assert me["tally"][1] == {"option": "2026-11-18", "attacker": 1, "defender": 1}
    assert ATTACKER not in json.dumps(me), "Other accounts' votes stay private"


def test_a_closed_or_ended_vote_shows_no_vote(client):
    _declare(client, _voting(closes_at="2026-01-01T00:00:00Z"))
    assert _me(client)["vote"] is None
    _post_events(client, [_event("votes_changed", "2026-11-10T11:00:00Z", private={"voting": _voting(None)})])
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    me = _me(client)
    assert me["vote"] is None and me["eligible"] is True and me["tally"] is None
    _post_events(client, [_event("war_ended", "2026-11-10T12:00:00Z",
                                 payload={"reason": "white_peace", "winner": None},
                                 private={"voting": _voting()})])
    assert _me(client)["vote"] is None


def test_me_of_an_unknown_war_is_404(client):
    assert client.get("/main/wars/w99-1/me").status_code == 404
    assert client.get("/main/wars/bad key!/me").status_code == 404


def test_hour_votes_use_schedule_hours(client):
    _declare(client, _voting("hour", options=[20, 21, 22], labels=["20:00 CET", "21:00 CET", "22:00 CET"],
                             votes={ATTACKER: [21]}))
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    me = _me(client)
    assert me["vote"]["kind"] == "hour" and me["vote"]["options"] == [20, 21, 22]
    assert me["picks"] == [21]
    assert _vote(client, [22, 20], kind="hour").status_code == 200
    assert _actions()[-1]["payload"] == {"picks": [20, 22]}
    assert _vote(client, ["2026-11-17"], kind="day").status_code == 409, "The open vote is the hour vote"


# --- voting ------------------------------------------------------------------------------


def test_a_vote_is_queued_and_replaces_the_pending_one(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    first = _vote(client, ["2026-11-19", "2026-11-17", "2026-11-19"])
    assert first.status_code == 200, first.text
    action = first.json()["action"]
    assert action["status"] == "pending" and action["kind"] == "day_vote" and action["source"] == "web"
    assert action["payload"] == {"picks": ["2026-11-17", "2026-11-19"]}, "Picks are a set in option order"

    second = _vote(client, []).json()["action"]
    rows = _actions()
    assert [(r["status"], r["reason"]) for r in rows] == [("expired", actions.REPLACED_REASON), ("pending", None)]
    assert rows[1]["account_uuid"] == ATTACKER and rows[1]["discord_user_id"] == DISCORD[ATTACKER]
    assert _me(client)["actions"]["day_vote"]["id"] == second["id"]


@pytest.mark.parametrize(
    ("setup", "body", "status", "detail"),
    [
        ("outsider", {"kind": "day", "picks": ["2026-11-17"]}, 403, "Only members of the warring factions vote."),
        ("attacker", {"kind": "day", "picks": ["2026-11-30"]}, 400, "Pick from the options of the vote."),
        ("attacker", {"kind": "day", "picks": "2026-11-17"}, 422, None),
        ("attacker", {"kind": "week", "picks": []}, 400, "kind must be day or hour."),
        ("attacker", {"kind": "hour", "picks": [21]}, 409, "This vote is closed."),
        ("unlinked", {"kind": "day", "picks": []}, 409, "minecraft_not_linked"),
        ("signed_out", {"kind": "day", "picks": []}, 401, "not_signed_in"),
    ],
)
def test_votes_are_refused_up_front(client, setup, body, status, detail):
    _declare(client)
    if setup == "outsider":
        _link(OUTSIDER)
        _sign_in(client, DISCORD[OUTSIDER])
    elif setup == "attacker":
        _link(ATTACKER)
        _sign_in(client, DISCORD[ATTACKER])
    elif setup == "unlinked":
        _sign_in(client, UNLINKED_DISCORD)
    reply = client.post(f"/main/wars/{WAR}/vote", json=body, headers=ORIGIN)
    assert reply.status_code == status, reply.text
    if detail:
        assert reply.json()["detail"] == detail
    assert _actions() == []


def test_a_vote_from_another_origin_is_refused(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    assert _vote(client, [], headers={"Origin": "https://evil.example"}).status_code == 403
    assert _vote(client, [], headers={}).status_code == 403
    assert _actions() == []


def test_a_closed_vote_is_refused(client):
    _declare(client, _voting(closes_at="2026-01-01T00:00:00Z"))
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    assert _vote(client, ["2026-11-17"]).json()["detail"] == "This vote is closed."


def test_votes_are_rate_limited(client, monkeypatch):
    monkeypatch.setattr(actions, "RATE_LIMIT", 3)
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    assert [_vote(client, []).status_code for _ in range(4)] == [200, 200, 200, 429]


# --- the plugin's poll -------------------------------------------------------------------


def test_the_plugin_polls_applies_and_the_page_shows_the_result(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    queued = _vote(client, ["2026-11-20"]).json()["action"]

    assert client.get("/wars/plugin/actions/pending", params={"realm": "main"}).status_code == 401
    rows = _pending(client)
    assert rows == [{"id": queued["id"], "war_key": WAR, "kind": "day_vote", "account_uuid": ATTACKER,
                     "source": "web", "payload": {"picks": ["2026-11-20"]}, "created_at": queued["created_at"]}]
    assert _actions()[0]["delivered_at"] is not None
    assert _pending(client) == [], "A row just handed out waits before it is offered again"
    assert _pending(client, "dev") == []
    _sql("UPDATE war_actions SET delivered_at = now() - interval '31 seconds'")
    assert [r["id"] for r in _pending(client)] == [queued["id"]], "A lost /applied is offered again"

    assert _applied(client, [{"id": queued["id"], "status": "applied", "reason": None}]) == {"acked": [queued["id"]]}
    me = _me(client)
    assert me["actions"]["day_vote"]["status"] == "applied"
    assert me["picks"] == ["2026-11-20"], "The applied picks show before the plugin's next votes_changed arrives"
    assert _pending(client) == []

    # The first result wins: a duplicate cannot turn "applied" into "rejected".
    assert _applied(client, [{"id": queued["id"], "status": "rejected", "reason": "late"}])["acked"] == [queued["id"]]
    assert _actions()[0]["status"] == "applied"

    # Then the plugin's own state, received after the result, is the truth again.
    _post_events(client, [_event("votes_changed", "2026-11-10T11:00:00Z",
                                 private={"voting": _voting(votes={ATTACKER: ["2026-11-21"]})})])
    assert _me(client)["picks"] == ["2026-11-21"]


def test_a_rejected_action_shows_its_reason(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    queued = _vote(client, ["2026-11-20"]).json()["action"]
    _applied(client, [{"id": queued["id"], "status": "rejected", "reason": "  The day vote has closed.  "}])
    action = _me(client)["actions"]["day_vote"]
    assert action["status"] == "rejected" and action["reason"] == "The day vote has closed."
    assert _me(client)["picks"] == ["2026-11-18"]


def test_bad_results_are_listed_and_the_rest_stored(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    queued = _vote(client, []).json()["action"]
    reply = _applied(client, [
        {"id": "x", "status": "applied"},
        {"id": queued["id"], "status": "maybe"},
        {"id": 999999, "status": "applied"},
        {"id": queued["id"], "status": "applied"},
    ])
    assert reply["acked"] == [queued["id"]]
    assert [r["reason"] for r in reply["rejected"]] == [
        "id must be an integer", "status must be applied or rejected", "no such action"]


def test_actions_expire_ten_minutes_after_creation(client):
    _declare(client)
    _link(ATTACKER)
    _sign_in(client, DISCORD[ATTACKER])
    queued = _vote(client, []).json()["action"]
    _sql("UPDATE war_actions SET created_at = now() - interval '11 minutes'")
    assert _pending(client) == []
    action = _me(client)["actions"]["day_vote"]
    assert action["status"] == "expired" and action["reason"] == actions.EXPIRED_REASON
    # A result that arrives after all is still recorded.
    _applied(client, [{"id": queued["id"], "status": "applied"}])
    assert _actions()[0]["status"] == "applied"


# --- calls to arms -----------------------------------------------------------------------


def test_a_call_to_arms_dms_the_linked_leader_in_dm_realms(client):
    _declare(client)
    _declare(client, realm="dev")
    _link(LEADER)
    _post_events(client, [_call_sent()])
    dev_call = _call_sent()
    _post_events(client, [dev_call], realm="dev")
    with database.connect() as conn:
        rows = conn.execute("SELECT * FROM war_notifications WHERE kind = 'call_to_arms_dm'").fetchall()
    assert len(rows) == 1, "Dev is not a DM realm by default"
    assert rows[0]["realm_id"] == "main"
    assert rows[0]["payload"] == {
        "discord_user_id": DISCORD[LEADER],
        "war_key": WAR,
        "war_name": "War of the Seven Days",
        "at": "2026-11-10T10:00:00Z",
        "caller_name": "The Aureate Coterie",
        "caller_rgb": "201,162,39",
        "target_faction_id": "sprockets",
        "target_name": "The Jolly Sprockets",
        "side": "attacker",
        "enemy_name": "House Malestroit",
        "coalition": False,
        "url": f"{SITE}/wars/{WAR}",
    }
    assert LEADER not in json.dumps(rows[0]["payload"])

    # An unlinked leader gets nothing.
    _post_events(client, [_call_sent(target=VELLMOOR, leader=OUTSIDER)])
    with database.connect() as conn:
        assert conn.execute("SELECT count(*) AS n FROM war_notifications WHERE kind = 'call_to_arms_dm'"
                            ).fetchone()["n"] == 1


def test_the_leader_sees_open_calls_until_they_close(client):
    _declare(client)
    _link(LEADER)
    _sign_in(client, DISCORD[LEADER])
    _post_events(client, [_call_sent(), _call_sent(target=VELLMOOR, leader=ATTACKER)])
    calls = _me(client)["calls_to_arms"]
    assert calls == [{"caller": faction_ref(AUREATE), "target": faction_ref(SPROCKETS),
                      "side": "attacker", "coalition": False, "action": None}]

    answer = client.post(f"/main/wars/{WAR}/call-to-arms", json={"target_faction_id": "SPROCKETS", "accept": True},
                         headers=ORIGIN)
    assert answer.status_code == 200, answer.text
    assert answer.json()["action"]["payload"] == {"target_faction_id": "sprockets", "accept": True}
    assert _me(client)["calls_to_arms"][0]["action"]["status"] == "pending"

    _post_events(client, [_event("call_to_arms_closed", "2026-11-10T10:05:00Z",
                                 payload={"target": SPROCKETS, "result": "declined"})])
    assert _me(client)["calls_to_arms"] == []
    reply = client.post(f"/main/wars/{WAR}/call-to-arms", json={"target_faction_id": "sprockets", "accept": True},
                        headers=ORIGIN)
    assert reply.status_code == 409 and reply.json()["detail"] == actions.NO_CALL_REASON

    # A new call after the old one shows without the old answer.
    _post_events(client, [_call_sent(at="2026-11-10T11:00:00Z")])
    assert _me(client)["calls_to_arms"][0]["action"] is None
    _post_events(client, [_event("participant_joined", "2026-11-10T11:05:00Z",
                                 payload={"faction": SPROCKETS, "side": "attacker", "role": "ally"})])
    assert _me(client)["calls_to_arms"] == []


def test_a_war_end_closes_every_call(client):
    _declare(client)
    _link(LEADER)
    _sign_in(client, DISCORD[LEADER])
    _post_events(client, [_call_sent()])
    _post_events(client, [_event("war_ended", "2026-11-10T12:00:00Z", payload={"reason": "white_peace"})])
    assert _me(client)["calls_to_arms"] == []


# --- the bot's routes --------------------------------------------------------------------


def _staff_action(client, discord_user_id, **overrides):
    body = {"realm": "main", "discord_user_id": discord_user_id, "war_key": WAR, "kind": "call_to_arms_answer",
            "payload": {"target_faction_id": "sprockets", "accept": False}}
    body.update(overrides)
    return client.post("/wars/staff/actions", json=body, headers=STAFF)


def test_the_bot_queues_an_answer_and_reads_its_status(client):
    _declare(client)
    _link(LEADER)
    _post_events(client, [_call_sent()])
    assert client.post("/wars/staff/actions", json={}, headers={}).status_code in (401, 422)

    reply = _staff_action(client, DISCORD[LEADER])
    assert reply.status_code == 200, reply.text
    queued = reply.json()
    assert queued == {"id": queued["id"], "status": "pending"}
    row = _actions()[0]
    assert (row["source"], row["account_uuid"], row["discord_user_id"]) == ("discord", LEADER, DISCORD[LEADER])

    status = client.get(f"/wars/staff/actions/{queued['id']}", headers=STAFF)
    assert status.status_code == 200
    assert status.json()["status"] == "pending" and status.json()["reason"] is None
    _pending(client)
    _applied(client, [{"id": queued["id"], "status": "rejected",
                       "reason": "A battle of this war is being fought. Answer the call once it ends."}])
    status = client.get(f"/wars/staff/actions/{queued['id']}", headers=STAFF).json()
    assert status["status"] == "rejected" and status["reason"].startswith("A battle of this war")
    assert client.get("/wars/staff/actions/999999", headers=STAFF).status_code == 404
    assert client.get(f"/wars/staff/actions/{queued['id']}").status_code == 401


def test_the_bot_route_queues_even_without_a_known_open_call(client):
    # The plugin is the authority and gives the reason the bot shows.
    _declare(client)
    _link(LEADER)
    assert _staff_action(client, DISCORD[LEADER]).status_code == 200


@pytest.mark.parametrize(
    ("discord_user_id", "overrides", "status", "detail"),
    [
        (UNLINKED_DISCORD, {}, 409, "discord_not_linked"),
        (DISCORD[LEADER], {"kind": "day_vote"}, 400, "kind must be call_to_arms_answer"),
        (DISCORD[LEADER], {"war_key": "w99-1"}, 404, "War not found"),
        (DISCORD[LEADER], {"payload": {"target_faction_id": "sprockets"}}, 400, "accept must be true or false."),
        (DISCORD[LEADER], {"realm": "Not A Realm!"}, 400, None),
    ],
)
def test_the_bot_route_refuses(client, discord_user_id, overrides, status, detail):
    _declare(client)
    _link(LEADER)
    reply = _staff_action(client, discord_user_id, **overrides)
    assert reply.status_code == status, reply.text
    if detail:
        assert reply.json()["detail"] == detail


def test_voting_view_cleans_what_the_plugin_sends():
    view = actions.voting_view({
        "kind": "hour", "options": [21, 21, "22", 23.0, True], "option_labels": ["21:00 CET"],
        "closes_at": "2026-11-19T19:00:00Z",
        "eligible": {ATTACKER.upper(): "Attacker", DEFENDER: "neutral"},
        "votes": {ATTACKER: [21, "x"]},
        "tally": [{"option": 21, "attacker": 2, "defender": -1}, "junk"],
    })
    assert view["options"] == [21, 23]
    assert view["option_labels"] == ["21:00 CET", "23"]
    assert view["eligible"] == {ATTACKER.replace("-", ""): "attacker"}
    assert view["votes"] == {ATTACKER.replace("-", ""): [21]}
    assert view["tally"] == [{"option": 21, "attacker": 2, "defender": 0}, {"option": 23, "attacker": 0, "defender": 0}]
    assert actions.voting_view(None) is None
    assert actions.voting_view({"kind": "week"})["kind"] is None

