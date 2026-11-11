"""Battle availability (contract v1.4): the grid on /me, availability actions, the battle day
post, reminder DMs and mutes, against Postgres."""

from __future__ import annotations

import json

import pytest

from src import database
from src.wars import actions, notifications
from src.wars.test_actions import (  # noqa: F401 - `client` is a fixture
    ATTACKER,
    DEFENDER,
    DISCORD,
    ORIGIN,
    OUTSIDER,
    PLUGIN,
    SITE,
    STAFF,
    UNLINKED_DISCORD,
    WAR,
    _actions,
    _applied,
    _declare,
    _event,
    _link,
    _me,
    _pending,
    _post_events,
    _sign_in,
    _sql,
    _voting,
    client,
)

pytestmark = pytest.mark.usefixtures("postgres")

HOURS = [21, 22, 23, 24, 25]
HOUR_LABELS = ["21:00 CET", "22:00 CET", "23:00 CET", "00:00 CET", "01:00 CET"]
FUTURE = "2099-01-01T00:00:00Z"
PAST = "2026-01-01T00:00:00Z"
OPEN_DAY, BATTLE_DAY, LOCKED_DAY, NO_BATTLE_DAY = "2026-11-21", "2026-11-20", "2026-11-19", "2026-11-22"


def _date(day: str, state: str = "open", *, hour=None, editable=True, time_locks_at=FUTURE, forced=False,
          day_locks_at=None) -> dict:
    return {"date": day, "label": day, "state": state, "day_locks_at": day_locks_at or time_locks_at,
            "time_locks_at": time_locks_at, "hour": hour, "editable": editable, "forced": forced}


def _grid(*, marks=None, none=None, dates=None) -> dict:
    dates = dates if dates is not None else [
        _date(LOCKED_DAY, "battle", hour=22, editable=False, time_locks_at=PAST),
        _date(BATTLE_DAY, "battle"),
        _date(OPEN_DAY),
        _date(NO_BATTLE_DAY, "no_battle", editable=False),
    ]
    return {
        "kind": "availability",
        "hours": HOURS,
        "hour_labels": HOUR_LABELS,
        "dates": dates,
        "closes_at": FUTURE,
        "need": {"attacker": 3, "defender": 2},
        "eligible": {ATTACKER: "attacker", DEFENDER.upper(): "defender"},
        "marks": marks if marks is not None else {ATTACKER: {BATTLE_DAY: [22, 21], OPEN_DAY: [23]},
                                                  DEFENDER: {BATTLE_DAY: [22]}},
        "none": none if none is not None else [],
        "tally": [{"date": BATTLE_DAY, "hour": 22, "attacker": 1, "defender": 1},
                  {"date": BATTLE_DAY, "hour": 21, "attacker": 1, "defender": 0},
                  {"date": OPEN_DAY, "hour": 23, "attacker": 1, "defender": 0}],
    }


def _signed_in(client, account=ATTACKER) -> None:
    _link(account)
    _sign_in(client, DISCORD[account])


def _mark(client, body: dict, headers=ORIGIN):
    return client.post(f"/main/wars/{WAR}/availability", json=body, headers=headers)


def _rows(kind: str) -> list[dict]:
    with database.connect() as conn:
        return conn.execute("SELECT * FROM war_notifications WHERE kind = %s ORDER BY id", (kind,)).fetchall()


def _reminder(at: str, *, reason="mark_availability", battle_day=None, accounts=(ATTACKER, DEFENDER), **extra):
    return _event("vote_reminder", at,
                  payload={"reason": reason, "battle_day": battle_day, "locks_at": "2026-11-18T20:00:00Z"},
                  private={"notify": {"accounts": list(accounts)}}, **extra)


# --- the private grid ----------------------------------------------------------------------


def test_availability_view_cleans_what_the_plugin_sends():
    view = actions.voting_view({
        "kind": "availability", "hours": [21, 21, "22", 24.0, True, 99], "hour_labels": ["21:00 CET"],
        "dates": [_date("2026-11-20", "battle", hour=24), _date("2026-11-20"), {"date": "20/11"},
                  _date("2026-11-21", "weird", hour=23), _date("2026-11-22", "no_battle", editable=True)],
        "closes_at": "2026-11-18T20:00:00Z",
        "need": {"attacker": 0, "defender": 2},
        "eligible": {ATTACKER.upper(): "Attacker", DEFENDER: "neutral"},
        "marks": {ATTACKER: {"2026-11-20": [24, 21, 22, "x"], "2026-12-01": [21], "2026-11-21": []}},
        "none": [DEFENDER, DEFENDER.upper(), 7],
        "tally": [{"date": "2026-11-20", "hour": 24, "attacker": 2, "defender": -1}, "junk",
                  {"date": "2026-12-01", "hour": 21, "attacker": 9, "defender": 9}],
    })
    bare = ATTACKER.replace("-", "")
    assert view["hours"] == [21, 24]
    assert view["hour_labels"] == ["21:00 CET", "00:00 CET"]
    assert [d["date"] for d in view["dates"]] == ["2026-11-20", "2026-11-21", "2026-11-22"]
    assert view["dates"][0]["hour"] == 24 and view["dates"][1]["state"] == "open"
    assert view["dates"][1]["hour"] is None, "An hour that is not offered is dropped"
    assert view["dates"][2]["editable"] is False, "A no-battle date is never editable"
    assert view["need"] == {"attacker": 1, "defender": 2}
    assert view["eligible"] == {bare: "attacker"}
    assert view["marks"] == {bare: {"2026-11-20": [21, 24]}}, "Only shown dates and offered hours"
    assert view["none"] == [DEFENDER.replace("-", "")]
    assert view["tally"][:2] == [{"date": "2026-11-20", "hour": 21, "attacker": 0, "defender": 0},
                                 {"date": "2026-11-20", "hour": 24, "attacker": 2, "defender": 0}]
    assert len(view["tally"]) == 6, "One row per shown date and hour"


def test_an_eligible_user_sees_the_grid_their_marks_and_the_tally(client):
    _declare(client, _grid(none=[DEFENDER]))
    _signed_in(client)
    me = _me(client)
    vote = me["vote"]
    assert vote["kind"] == "availability" and vote["hours"] == HOURS and vote["hour_labels"] == HOUR_LABELS
    assert vote["need"] == {"attacker": 3, "defender": 2} and vote["closes_at"] == FUTURE
    editable = {d["date"]: d["editable"] for d in vote["dates"]}
    assert editable == {LOCKED_DAY: False, BATTLE_DAY: True, OPEN_DAY: True, NO_BATTLE_DAY: False}, \
        "A date whose time lock passed is not editable, whatever the stale state says"
    assert me["marks"] == {BATTLE_DAY: [21, 22], OPEN_DAY: [23]}
    assert me["none"] is False and me["picks"] is None
    assert {"date": BATTLE_DAY, "hour": 22, "attacker": 1, "defender": 1} in me["tally"]
    assert DEFENDER not in json.dumps(me) and DEFENDER.replace("-", "") not in json.dumps(me)

    _signed_in(client, DEFENDER)
    me = _me(client)
    assert me["side"] == "defender" and me["none"] is True and me["marks"] == {BATTLE_DAY: [22]}


def test_others_see_only_that_a_grid_is_open(client):
    _declare(client, _grid())
    assert _me(client)["vote"] == {"kind": "availability", "closes_at": FUTURE}
    _signed_in(client, OUTSIDER)
    me = _me(client)
    assert me["eligible"] is False and me["vote"] == {"kind": "availability", "closes_at": FUTURE}
    assert me["marks"] is None and me["tally"] is None and me["none"] is None
    assert "2026-11-20" not in json.dumps(me)


def test_a_grid_with_no_dates_is_no_vote(client):
    _declare(client, _grid(dates=[]))
    _signed_in(client)
    assert _me(client)["vote"] is None


# --- marking -------------------------------------------------------------------------------


def test_marks_are_queued_per_date_and_replace_the_pending_change_of_that_date(client):
    _declare(client, _grid())
    _signed_in(client)
    first = _mark(client, {"date": OPEN_DAY, "hours": [25, 21, 25]})
    assert first.status_code == 200, first.text
    action = first.json()["action"]
    assert action["kind"] == "availability" and action["status"] == "pending" and action["source"] == "web"
    assert action["payload"] == {"date": OPEN_DAY, "hours": [21, 25]}, "Hours are a set in offered order"

    _mark(client, {"date": BATTLE_DAY, "hours": []})
    _mark(client, {"date": OPEN_DAY, "hours": [22]})
    _mark(client, {"none": True})
    rows = _actions()
    assert [(r["payload"], r["status"]) for r in rows] == [
        ({"date": OPEN_DAY, "hours": [21, 25]}, "expired"),
        ({"date": BATTLE_DAY, "hours": []}, "pending"),
        ({"date": OPEN_DAY, "hours": [22]}, "pending"),
        ({"none": True}, "pending"),
    ]
    assert rows[0]["reason"] == actions.REPLACED_REASON
    assert rows[1]["discord_user_id"] == DISCORD[ATTACKER]
    me = _me(client)
    assert [a["payload"] for a in me["availability_actions"]] == [
        {"date": BATTLE_DAY, "hours": []}, {"date": OPEN_DAY, "hours": [22]}, {"none": True}]
    assert me["actions"]["availability"]["payload"] == {"none": True}


@pytest.mark.parametrize(
    ("setup", "body", "status", "detail"),
    [
        ("outsider", {"date": OPEN_DAY, "hours": [21]}, 403, actions.NOT_ELIGIBLE_REASON),
        ("attacker", {"date": NO_BATTLE_DAY, "hours": [21]}, 409, actions.DAY_DECIDED_REASON),
        ("attacker", {"date": LOCKED_DAY, "hours": [21]}, 409, actions.DAY_DECIDED_REASON),
        ("attacker", {"date": "2026-12-01", "hours": [21]}, 409, actions.NOT_SHOWN_REASON),
        ("attacker", {"date": OPEN_DAY, "hours": [20]}, 400, actions.BAD_HOURS_REASON),
        ("attacker", {"date": OPEN_DAY, "hours": ["21"]}, 400, actions.BAD_HOURS_REASON),
        ("attacker", {"date": OPEN_DAY}, 400, "Send a date and its start times, or none."),
        ("attacker", {"none": False}, 400, "Send a date and its start times, or none."),
        ("attacker", {"date": OPEN_DAY, "hours": "21"}, 422, None),
        ("attacker", {"date": OPEN_DAY, "hours": [10**400]}, 400, actions.BAD_HOURS_REASON),
        ("attacker", {"date": OPEN_DAY, "hours": [-(10**400)]}, 400, actions.BAD_HOURS_REASON),
        ("unlinked", {"none": True}, 409, "minecraft_not_linked"),
        ("signed_out", {"none": True}, 401, "not_signed_in"),
    ],
)
def test_marks_are_refused_up_front(client, setup, body, status, detail):
    _declare(client, _grid())
    if setup == "outsider":
        _signed_in(client, OUTSIDER)
    elif setup == "attacker":
        _signed_in(client)
    elif setup == "unlinked":
        _sign_in(client, UNLINKED_DISCORD)
    reply = _mark(client, body)
    assert reply.status_code == status, reply.text
    if detail:
        assert reply.json()["detail"] == detail
    assert _actions() == []


def test_an_open_date_past_its_day_lock_is_being_decided(client):
    deciding = _date(OPEN_DAY, day_locks_at=PAST)
    _declare(client, _grid(dates=[_date(BATTLE_DAY, "battle", day_locks_at=PAST), deciding]))
    _signed_in(client)
    reply = _mark(client, {"date": OPEN_DAY, "hours": [21]})
    assert reply.status_code == 409 and reply.json()["detail"] == actions.DAY_DECIDED_REASON
    assert _mark(client, {"date": BATTLE_DAY, "hours": [21]}).status_code == 200, "A battle day waits for its time lock"
    editable = {d["date"]: d["editable"] for d in _me(client)["vote"]["dates"]}
    assert editable == {BATTLE_DAY: True, OPEN_DAY: False}


def test_the_old_votes_and_the_grid_do_not_mix(client):
    _declare(client, _voting())
    _signed_in(client)
    assert _mark(client, {"date": "2026-11-17", "hours": [21]}).json()["detail"] == actions.CLOSED_REASON
    _post_events(client, [_event("votes_changed", "2026-11-10T11:00:00Z", private={"voting": _grid()})])
    reply = client.post(f"/main/wars/{WAR}/vote", json={"kind": "day", "picks": []}, headers=ORIGIN)
    assert reply.status_code == 409 and reply.json()["detail"] == actions.CLOSED_REASON
    assert _mark(client, {"none": True}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_marks_share_the_vote_rate_limit(client, monkeypatch):
    monkeypatch.setattr(actions, "RATE_LIMIT", 3)
    _declare(client, _grid())
    _signed_in(client)
    assert [_mark(client, {"date": OPEN_DAY, "hours": []}).status_code for _ in range(4)] == [200, 200, 200, 429]


def test_applied_marks_show_until_the_plugin_state_arrives(client):
    _declare(client, _grid())
    _signed_in(client)
    change = _mark(client, {"date": OPEN_DAY, "hours": [24, 25]}).json()["action"]
    clear = _mark(client, {"date": BATTLE_DAY, "hours": []}).json()["action"]
    rows = _pending(client)
    assert [(r["kind"], r["payload"], r["account_uuid"]) for r in rows] == [
        ("availability", {"date": OPEN_DAY, "hours": [24, 25]}, ATTACKER),
        ("availability", {"date": BATTLE_DAY, "hours": []}, ATTACKER),
    ]
    _applied(client, [{"id": change["id"], "status": "applied"},
                      {"id": clear["id"], "status": "rejected", "reason": "Too late."}])
    me = _me(client)
    assert me["marks"] == {BATTLE_DAY: [21, 22], OPEN_DAY: [24, 25]}, "The applied change shows, the refused one not"
    assert [a["status"] for a in me["availability_actions"]] == ["applied", "rejected"]

    none = _mark(client, {"none": True}).json()["action"]
    _pending(client)
    _applied(client, [{"id": none["id"], "status": "applied"}])
    me = _me(client)
    assert me["none"] is True and me["marks"] == {}, "None of these days clears the marks on editable dates"

    _post_events(client, [_event("votes_changed", "2026-11-10T11:00:00Z",
                                 private={"voting": _grid(marks={ATTACKER: {OPEN_DAY: [21]}})})])
    me = _me(client)
    assert me["marks"] == {OPEN_DAY: [21]} and me["none"] is False, "The plugin's newer state is the truth"


def test_a_newer_pending_or_refused_change_keeps_the_applied_marks(client):
    _declare(client, _grid())
    _signed_in(client)
    first = _mark(client, {"date": OPEN_DAY, "hours": [24, 25]}).json()["action"]
    _pending(client)
    _applied(client, [{"id": first["id"], "status": "applied"}])
    second = _mark(client, {"date": OPEN_DAY, "hours": [21]}).json()["action"]
    me = _me(client)
    assert me["marks"][OPEN_DAY] == [24, 25], "The applied change shows while the next one waits"
    assert [a["status"] for a in me["availability_actions"]] == ["pending"], "Status is the latest per date"
    _pending(client)
    _applied(client, [{"id": second["id"], "status": "rejected", "reason": "Too late."}])
    me = _me(client)
    assert me["marks"][OPEN_DAY] == [24, 25], "A refused change leaves the applied one"
    assert [(a["id"], a["status"]) for a in me["availability_actions"]] == [(second["id"], "rejected")]


# --- events, posts and DMs -----------------------------------------------------------------


def _battle_day_locked(at="2026-11-18T20:00:00Z", **payload):
    return _event("battle_day_locked", at, payload={"battle_day": BATTLE_DAY,
                                                     "time_locks_at": "2026-11-19T20:00:00Z",
                                                     "forced": False, **payload})


def test_a_battle_day_gets_a_timeline_entry_and_a_thread_post(client):
    _declare(client, _grid())
    _post_events(client, [_battle_day_locked(), _battle_day_locked("2026-11-19T20:00:00Z", battle_day=OPEN_DAY,
                                                                   forced=True)])
    timeline = client.get(f"/main/wars/{WAR}").json()["timeline"]
    assert [e["summary"] for e in timeline[1:]] == [
        "Battle day set: Fri 20 Nov.",
        "Battle day set: Sat 21 Nov. Too many days went by without a battle, so this one is a battle day anyway.",
    ]
    assert timeline[1]["payload"] == {"battle_day": BATTLE_DAY, "time_locks_at": "2026-11-19T20:00:00Z",
                                      "forced": False}
    rows = _rows("battle_day_locked")
    assert rows[0]["payload"] == {
        "war_key": WAR,
        "war_name": "War of the Seven Days",
        "at": "2026-11-18T20:00:00Z",
        "url": f"{SITE}/wars/{WAR}",
        "summary": "Battle day set: Fri 20 Nov.",
        "battle_day": BATTLE_DAY,
        "battle_day_label": "Fri 20 Nov",
        "time_locks_at": "2026-11-19T20:00:00Z",
        "forced": False,
        "vote_url": f"{SITE}/wars/{WAR}#vote",
    }
    assert rows[1]["payload"]["forced"] is True


def test_a_dev_battle_day_links_the_dev_map(client):
    _declare(client, _grid(), realm="dev")
    _post_events(client, [_battle_day_locked()], realm="dev")
    assert _rows("battle_day_locked")[0]["payload"]["vote_url"] == f"{SITE}/wars/{WAR}?map=dev#vote"


def test_a_reminder_dms_each_linked_user_once_a_day_and_stays_off_the_page(client):
    _declare(client, _grid())
    _link(ATTACKER)
    _link(DEFENDER)
    _post_events(client, [_reminder("2026-11-17T20:00:00Z", accounts=(ATTACKER, DEFENDER.upper(), OUTSIDER))])
    rows = _rows("vote_reminder_dm")
    assert sorted(r["payload"]["discord_user_id"] for r in rows) == [DISCORD[ATTACKER], DISCORD[DEFENDER]]
    assert rows[0]["payload"] == {
        "discord_user_id": DISCORD[ATTACKER],
        "realm": "main",
        "war_key": WAR,
        "war_name": "War of the Seven Days",
        "at": "2026-11-17T20:00:00Z",
        "reason": "mark_availability",
        "battle_day": None,
        "battle_day_label": None,
        "locks_at": "2026-11-18T20:00:00Z",
        "url": f"{SITE}/wars/{WAR}",
        "vote_url": f"{SITE}/wars/{WAR}#vote",
    }
    assert ATTACKER not in json.dumps([r["payload"] for r in rows])
    timeline = client.get(f"/main/wars/{WAR}").json()["timeline"]
    assert [e["type"] for e in timeline] == ["war_declared"], "A reminder has no timeline entry"

    # A later reminder the same UTC day DMs nobody it already reminded.
    _post_events(client, [_reminder("2026-11-18T20:00:00Z", reason="battle_day_locked", battle_day=BATTLE_DAY)])
    assert len(_rows("vote_reminder_dm")) == 2
    # The next day, they are reminded again.
    _sql("UPDATE war_notifications SET created_at = created_at - interval '1 day'")
    _post_events(client, [_reminder("2026-11-19T17:00:00Z", reason="time_lock_soon", battle_day=BATTLE_DAY,
                                    accounts=(DEFENDER,))])
    latest = _rows("vote_reminder_dm")[-1]["payload"]
    assert len(_rows("vote_reminder_dm")) == 3
    assert (latest["reason"], latest["battle_day"], latest["battle_day_label"]) == (
        "time_lock_soon", BATTLE_DAY, "Fri 20 Nov")


def test_a_muted_war_sends_no_reminders(client):
    _declare(client, _grid())
    _link(ATTACKER)
    _link(DEFENDER)
    assert client.post("/wars/staff/mutes", json={"realm": "main", "war_key": WAR,
                                                  "discord_user_id": DISCORD[ATTACKER]}).status_code == 401
    body = {"realm": "main", "war_key": WAR, "discord_user_id": DISCORD[ATTACKER]}
    assert client.post("/wars/staff/mutes", json=body, headers=STAFF).json() == {"muted": True, "new": True}
    assert client.post("/wars/staff/mutes", json=body, headers=STAFF).json() == {"muted": True, "new": False}
    _post_events(client, [_reminder("2026-11-17T20:00:00Z")])
    assert [r["payload"]["discord_user_id"] for r in _rows("vote_reminder_dm")] == [DISCORD[DEFENDER]]
    assert not _rows("vote_reminder_dm")[0]["acked_at"]
    # Muting acknowledges the reminders still queued, so the bot never gets them.
    defender = {"realm": "main", "war_key": WAR, "discord_user_id": DISCORD[DEFENDER]}
    assert client.post("/wars/staff/mutes", json=defender, headers=STAFF).json()["new"] is True
    assert _rows("vote_reminder_dm")[0]["acked_at"] is not None
    assert "vote_reminder_dm" not in [r["kind"] for r in notifications.pending()]
    # A mute is per war and realm.
    _post_events(client, [_reminder("2026-11-17T20:00:00Z", war_key="w8-1793642400")])
    assert DISCORD[ATTACKER] in [r["payload"]["discord_user_id"] for r in _rows("vote_reminder_dm")]


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"realm": "main", "war_key": WAR, "discord_user_id": "abc"}, 400),
        ({"realm": "main", "war_key": "bad key!", "discord_user_id": "1"}, 404),
        ({"realm": "Bad Realm!", "war_key": WAR, "discord_user_id": "1"}, 400),
        ({"realm": "main", "war_key": WAR}, 422),
    ],
)
def test_the_mute_route_refuses_bad_bodies(client, body, status):
    assert client.post("/wars/staff/mutes", json=body, headers=STAFF).status_code == status


def test_reminders_skip_dev_unknown_reasons_and_unlinked_accounts(client, monkeypatch):
    _declare(client, _grid(), realm="dev")
    _link(ATTACKER)
    _post_events(client, [_reminder("2026-11-17T20:00:00Z")], realm="dev")
    assert _rows("vote_reminder_dm") == [], "Test wars on Dev never message real players by default"
    _declare(client, _grid())
    _post_events(client, [_reminder("2026-11-17T20:00:00Z", reason="bake_a_cake"),
                          _reminder("2026-11-17T20:00:00Z", accounts=(OUTSIDER,))])
    assert _rows("vote_reminder_dm") == []
    assert notifications.reminder_accounts({"notify": {"accounts": [ATTACKER.upper(), ATTACKER, 3]}}) == [ATTACKER]
    assert notifications.reminder_accounts({"private": {"notify": {"accounts": "x"}}}) == []


def test_lock_times_and_battle_days_reach_the_public_state(client):
    event = _event("votes_changed", "2026-11-10T11:00:00Z", private={"voting": _grid()})
    event["state"].update(next_lock_at="2026-11-18T20:00:00Z", day_vote_closes_at=None,
                          battle_days=[{"date": BATTLE_DAY, "hour": None}, {"date": LOCKED_DAY, "hour": 22.0},
                                       {"date": "soon"}, "junk"])
    _declare(client, _grid())
    _post_events(client, [event])
    state = client.get(f"/main/wars/{WAR}").json()["state"]
    assert state["next_lock_at"] == "2026-11-18T20:00:00Z"
    assert state["battle_days"] == [{"date": BATTLE_DAY, "hour": None}, {"date": LOCKED_DAY, "hour": 22}]
    phase = client.get("/main/wars").json()["wars"][0]["phase"]
    assert phase["battle_days"] == state["battle_days"] and phase["next_lock_at"] == "2026-11-18T20:00:00Z"


def test_the_plugin_poll_takes_marks_and_answers_with_plugin_key_only(client):
    _declare(client, _grid())
    _signed_in(client)
    _mark(client, {"none": True})
    assert client.get("/wars/plugin/actions/pending", params={"realm": "main"}, headers=STAFF).status_code == 401
    assert client.get("/wars/plugin/actions/pending", params={"realm": "main"}, headers=PLUGIN).json()["actions"][0][
        "payload"] == {"none": True}
