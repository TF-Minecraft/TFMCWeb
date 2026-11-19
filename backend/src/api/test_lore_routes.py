"""The lore panel API (/lore) against Postgres: access, records, links, availability, team, bot outbox."""
from __future__ import annotations

import io
import os
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

os.environ.setdefault("SKINS_DEV", "1")

from src import database  # noqa: E402
from src.api.lore_routes import lore_router  # noqa: E402
from src.auth import users  # noqa: E402

pytestmark = pytest.mark.usefixtures("postgres")

STAFF_KEY = {"X-Staff-Key": "dev-staff-key"}
SITE = "https://site.example"
ORIGIN = {"Origin": SITE}
COOKIE = "__Host-tfmc_session"
TODAY = date.today()


@pytest.fixture
def client(monkeypatch):
    for name in ("PLUGIN_KEY", "STAFF_KEY", "PS_PRODUCTION", "SIGN_IN_SITE", "LORE_PANEL", "PUBLIC_SITE_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("DISCORD_AUTH_ENABLED", "1")
    monkeypatch.setenv("DISCORD_CLIENT_ID", "client-id")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("DISCORD_GUILD_ID", "999999999999999999")
    monkeypatch.setenv("DISCORD_REDIRECT_URI", SITE + "/api/auth/discord/callback")
    monkeypatch.setenv("SITE_PUBLIC_URL", SITE)
    app = FastAPI()
    app.include_router(lore_router)
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client


_ids = iter(range(1, 1_000_000))


class Person:
    def __init__(self, client: TestClient, name: str, *, role: str = "player", member: bool = False,
                 lead: bool = False, minecraft: str | None = None):
        self.client = client
        self.discord_id = str(300000000000000000 + next(_ids))
        self.token = users.sign_in(
            {"discord_user_id": self.discord_id, "discord_username": name, "discord_global_name": None,
             "discord_avatar": None},
            guild_member=True,
        )
        with database.connect() as conn:
            self.user_id = conn.execute(
                "UPDATE users SET role = %s WHERE discord_user_id = %s RETURNING id", (role, self.discord_id)
            ).fetchone()["id"]
            if member:
                conn.execute("INSERT INTO lore_members (user_id, is_lead) VALUES (%s, %s)", (self.user_id, lead))
            if minecraft:
                conn.execute(
                    "INSERT INTO discord_links (player_uuid, discord_user_id, minecraft_name, linked_at) "
                    "VALUES (%s, %s, %s, now())",
                    (f"00000000-0000-4000-8000-{next(_ids):012d}", self.discord_id, minecraft),
                )

    def _use(self):
        self.client.cookies.set(COOKIE, self.token)
        return self.client

    def get(self, path, **kw):
        return self._use().get("/lore" + path, **kw)

    def post(self, path, json=None, **kw):
        return self._use().post("/lore" + path, json=json, headers=ORIGIN, **kw)

    def put(self, path, json=None):
        return self._use().put("/lore" + path, json=json, headers=ORIGIN)

    def patch(self, path, json=None):
        return self._use().patch("/lore" + path, json=json, headers=ORIGIN)

    def delete(self, path):
        return self._use().delete("/lore" + path, headers=ORIGIN)


def ok(response, status=200):
    assert response.status_code == status, response.text
    return response.json()


def error(response, status):
    """The refusal code; details with extra data carry it under "code"."""
    assert response.status_code == status, response.text
    detail = response.json()["detail"]
    return detail["code"] if isinstance(detail, dict) else detail


def skin_png(color=(200, 30, 30, 255)) -> bytes:
    image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for x in range(8, 16):
        for y in range(8, 16):
            image.putpixel((x, y), color)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


# --------------------
# Access and the flag
# --------------------


def test_access_answers_everyone_without_401(client):
    client.cookies.clear()
    assert ok(client.get("/lore/access")) == {"enabled": True, "signed_in": False, "access": False,
                                                "can_manage_team": False, "user": None}
    player = Person(client, "player")
    body = ok(player.get("/access"))
    assert body["signed_in"] is True and body["access"] is False and body["user"] is None
    member = Person(client, "helper", member=True)
    body = ok(member.get("/access"))
    assert body["access"] is True and body["can_manage_team"] is False
    assert body["user"]["user_id"] == member.user_id
    staff = Person(client, "mod", role="mod")
    assert ok(staff.get("/access"))["can_manage_team"] is True


def test_reads_need_access(client):
    client.cookies.clear()
    assert error(client.get("/lore/characters"), 401) == "not_signed_in"
    player = Person(client, "player")
    assert error(player.get("/characters"), 403) == "no_access"
    assert error(player.post("/characters", {"name": "X"}), 403) == "no_access"


def test_writes_need_same_origin(client):
    member = Person(client, "helper", member=True)
    member._use()
    response = client.post("/lore/characters", json={"name": "X"}, headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


@pytest.mark.parametrize("env", [{"PS_PRODUCTION": "1"}, {"LORE_PANEL": "off"}])
def test_flag_off_hides_everything(client, monkeypatch, env):
    member = Person(client, "helper", member=True)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    assert ok(member.get("/access")) == {"enabled": False, "signed_in": False, "access": False,
                                         "can_manage_team": False, "user": None}
    assert member.get("/characters").status_code == 404
    assert member.get("/overview").status_code == 404
    assert client.get("/lore/staff/notifications", headers=STAFF_KEY).status_code == 404


def test_flag_on_in_production_when_set(client, monkeypatch):
    member = Person(client, "helper", member=True)
    monkeypatch.setenv("PS_PRODUCTION", "1")
    monkeypatch.setenv("LORE_PANEL", "1")
    assert ok(member.get("/access"))["enabled"] is True
    assert ok(member.get("/characters")) == {"items": []}


# --------------------
# Records
# --------------------

SAMPLES = {
    "characters": ({"name": "Aldric", "status": "active", "summary": "A knight"}, {"status": "dead"}),
    "organisations": ({"name": "The Order", "kind": "guild"}, {"game_faction": "Aureate"}),
    "storylines": ({"title": "The Fall", "status": "planning"}, {"status": "active"}),
    "locations": ({"name": "Old Keep", "x": 100, "y": 64, "z": -200, "kind": "ruin"}, {"y": None}),
    "events": ({"title": "Ambush", "status": "idea"}, {"status": "waiting", "waiting_on": "Map build"}),
}


@pytest.mark.parametrize("plural", list(SAMPLES))
def test_crud_history_delete_restore(client, plural):
    member = Person(client, "helper", member=True)
    create, change = SAMPLES[plural]
    item = ok(member.post(f"/{plural}", create))
    assert item["version"] == 1 and item["created_by"] == member.user_id

    listed = ok(member.get(f"/{plural}"))["items"]
    assert [row["id"] for row in listed] == [item["id"]]

    updated = ok(member.patch(f"/{plural}/{item['id']}", change | {"version": 1}))
    assert updated["version"] == 2
    for key, value in change.items():
        assert updated[key] == value
    assert error(member.patch(f"/{plural}/{item['id']}", change | {"version": 1}), 409) == "edited_elsewhere"
    assert error(member.patch(f"/{plural}/{item['id']}", change), 400) == "version_required"

    ok(member.delete(f"/{plural}/{item['id']}"))
    assert ok(member.get(f"/{plural}"))["items"] == []
    assert [row["id"] for row in ok(member.get(f"/{plural}?include_deleted=true"))["items"]] == [item["id"]]
    deleted = ok(member.get("/deleted"))["items"]
    assert [(row["id"], row["kind"]) for row in deleted] == [(item["id"], plural[:-1])]

    restored = ok(member.post(f"/{plural}/{item['id']}/restore"))
    assert restored["deleted_at"] is None

    actions = [row["action"] for row in ok(member.get(f"/{plural}/{item['id']}/history"))["history"]]
    assert actions == ["restored", "deleted", "updated", "created"]


def test_validation_errors(client):
    member = Person(client, "helper", member=True)
    assert error(member.post("/characters", {"name": "  "}), 400) == "name_required"
    assert error(member.post("/characters", {"name": "A", "status": "zombie"}), 400) == "bad_status"
    assert error(member.post("/events", {"title": "E", "status": "scheduled"}), 400) == "date_required"
    assert error(member.post("/events", {"title": "E", "status": "waiting"}), 400) == "waiting_on_required"
    assert error(member.post("/events", {"title": "E", "storyline_id": 999}), 400) == "bad_storyline_id"
    assert error(member.post("/events", {"title": "E", "starts_at": "2026-01-01T10:00"}), 400) == (
        "bad_starts_at"
    )
    assert error(member.post("/locations", {"name": "L", "x": 10**9}), 400) == "bad_x"
    assert member.get("/characters/0").status_code == 422
    assert error(member.get("/characters/12345"), 404) == "not_found"


def test_list_filters_and_search(client):
    member = Person(client, "helper", member=True)
    ok(member.post("/characters", {"name": "Aldric", "status": "dead"}))
    ok(member.post("/characters", {"name": "Maldric"}))
    ok(member.post("/organisations", {"name": "Aldric's Band"}))
    assert [c["name"] for c in ok(member.get("/characters?q=aldric"))["items"]] == ["Aldric", "Maldric"]
    assert [c["name"] for c in ok(member.get("/characters?status=dead"))["items"]] == ["Aldric"]

    results = ok(member.get("/search?q=ald"))["results"]
    assert [(r["kind"], r["label"]) for r in results][:2] == [("character", "Aldric"), ("organisation", "Aldric's Band")]
    only = ok(member.get("/search?q=ald&kinds=organisation"))["results"]
    assert [r["label"] for r in only] == ["Aldric's Band"]
    assert error(member.get("/search?q=a&kinds=dragon"), 400) == "bad_kind"


def test_mentions_make_backlinks(client):
    member = Person(client, "helper", member=True)
    keep = ok(member.post("/locations", {"name": "Old Keep"}))
    aldric = ok(member.post("/characters", {"name": "Aldric", "notes": f"Lives at [[location:{keep['id']}|the keep]]"}))
    backlinks = ok(member.get(f"/locations/{keep['id']}"))["backlinks"]
    assert [(b["kind"], b["id"]) for b in backlinks] == [("character", aldric["id"])]

    ok(member.delete(f"/characters/{aldric['id']}"))
    assert ok(member.get(f"/locations/{keep['id']}"))["backlinks"] == []
    ok(member.post(f"/characters/{aldric['id']}/restore"))
    ok(member.patch(f"/characters/{aldric['id']}", {"notes": "Moved away", "version": 1}))
    assert ok(member.get(f"/locations/{keep['id']}"))["backlinks"] == []


# --------------------
# Links
# --------------------


def test_relations_and_affiliations(client):
    member = Person(client, "helper", member=True)
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    brenna = ok(member.post("/characters", {"name": "Brenna"}))
    order = ok(member.post("/organisations", {"name": "The Order"}))

    relation = ok(member.post("/relations", {"source_kind": "character", "source_id": aldric["id"],
                                             "target_kind": "character", "target_id": brenna["id"],
                                             "type": "rival", "note": "Old feud"}))
    assert relation["target"]["label"] == "Brenna"
    assert error(member.post("/relations", {"source_kind": "character", "source_id": aldric["id"],
                                            "target_kind": "character", "target_id": brenna["id"],
                                            "type": "ally"}), 409) == "relation_exists"
    assert error(member.post("/relations", {"source_kind": "character", "source_id": aldric["id"],
                                            "target_kind": "character", "target_id": aldric["id"],
                                            "type": "ally"}), 400) == "self_relation"
    ok(member.patch(f"/relations/{relation['id']}", {"type": "hostile"}))
    detail = ok(member.get(f"/characters/{brenna['id']}"))
    assert any(r["type"] == "hostile" for side in detail["relations"].values() for r in side)

    detail = ok(member.put(f"/characters/{aldric['id']}/affiliations",
                           {"affiliations": [{"organisation_id": order["id"], "role": "Captain"}]}))
    assert detail["affiliations"] == [{"kind": "organisation", "id": order["id"], "label": "The Order",
                                       "role": "Captain"}]
    members = ok(member.put(f"/organisations/{order['id']}/members",
                            {"members": [{"character_id": brenna["id"], "role": ""}]}))["members"]
    assert [m["label"] for m in members] == ["Brenna"]
    assert ok(member.get(f"/characters/{aldric['id']}"))["affiliations"] == []

    ok(member.delete(f"/relations/{relation['id']}"))
    detail = ok(member.get(f"/characters/{brenna['id']}"))
    assert not any(side for side in detail["relations"].values())


def test_storyline_members_and_order(client):
    member = Person(client, "helper", member=True)
    story = ok(member.post("/storylines", {"title": "The Fall"}))
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    keep = ok(member.post("/locations", {"name": "Old Keep"}))
    first = ok(member.post("/events", {"title": "First", "storyline_id": story["id"]}))
    second = ok(member.post("/events", {"title": "Second", "storyline_id": story["id"]}))
    assert (first["storyline_position"], second["storyline_position"]) == (1, 2)

    detail = ok(member.put(f"/storylines/{story['id']}/members",
                           {"members": [{"kind": "character", "id": aldric["id"]},
                                        {"kind": "location", "id": keep["id"]}]}))
    assert {(m["kind"], m["id"]) for m in detail["members"]} == {("character", aldric["id"]), ("location", keep["id"])}
    assert [s["id"] for s in ok(member.get(f"/characters/{aldric['id']}"))["storylines"]] == [story["id"]]
    assert error(member.put(f"/storylines/{story['id']}/members", {"members": [{"kind": "event", "id": 1}]}),
                 400) == "bad_member"

    detail = ok(member.put(f"/storylines/{story['id']}/order", {"event_ids": [second["id"], first["id"]]}))
    assert [e["id"] for e in detail["events"]] == [second["id"], first["id"]]
    for bad in ([first["id"]], [first["id"], first["id"]], [first["id"], second["id"], 999]):
        assert error(member.put(f"/storylines/{story['id']}/order", {"event_ids": bad}), 400) == "bad_order"


def test_list_saves_keep_links_to_deleted_records(client):
    member = Person(client, "helper", member=True)
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    brenna = ok(member.post("/characters", {"name": "Brenna"}))
    order = ok(member.post("/organisations", {"name": "The Order"}))
    guild = ok(member.post("/organisations", {"name": "The Guild"}))
    story = ok(member.post("/storylines", {"title": "The Fall"}))
    event = ok(member.post("/events", {"title": "Ambush"}))
    ok(member.put(f"/characters/{aldric['id']}/affiliations",
                  {"affiliations": [{"organisation_id": order["id"], "role": "Captain"}]}))
    ok(member.put(f"/storylines/{story['id']}/members", {"members": [{"kind": "character", "id": aldric["id"]}]}))
    ok(member.put(f"/events/{event['id']}/characters", {"character_ids": [aldric["id"]]}))

    # The editors only see live records, so they save lists without the deleted ones.
    ok(member.delete(f"/organisations/{order['id']}"))
    ok(member.delete(f"/characters/{aldric['id']}"))
    ok(member.put(f"/organisations/{guild['id']}/members", {"members": [{"character_id": brenna["id"]}]}))
    ok(member.put(f"/storylines/{story['id']}/members", {"members": [{"kind": "character", "id": brenna["id"]}]}))
    ok(member.put(f"/events/{event['id']}/characters", {"character_ids": [brenna["id"]]}))

    ok(member.post(f"/organisations/{order['id']}/restore"))
    ok(member.post(f"/characters/{aldric['id']}/restore"))
    assert [a["id"] for a in ok(member.get(f"/characters/{aldric['id']}"))["affiliations"]] == [order["id"]]
    assert {m["id"] for m in ok(member.get(f"/storylines/{story['id']}"))["members"]} == {aldric["id"], brenna["id"]}
    assert {c["id"] for c in ok(member.get(f"/events/{event['id']}"))["characters"]} == {aldric["id"], brenna["id"]}

    # A character keeps its link to a deleted faction when its own list is saved.
    ok(member.delete(f"/organisations/{order['id']}"))
    detail = ok(member.put(f"/characters/{aldric['id']}/affiliations",
                           {"affiliations": [{"organisation_id": guild["id"], "role": ""}]}))
    assert [a["id"] for a in detail["affiliations"]] == [guild["id"]]
    ok(member.post(f"/organisations/{order['id']}/restore"))
    assert {a["id"] for a in ok(member.get(f"/characters/{aldric['id']}"))["affiliations"]} == {order["id"], guild["id"]}


def test_event_helpers_must_be_on_roster(client):
    member = Person(client, "helper", member=True)
    other = Person(client, "helper2", member=True)
    player = Person(client, "player")
    staff = Person(client, "mod", role="mod")
    event = ok(member.post("/events", {"title": "Ambush"}))
    aldric = ok(member.post("/characters", {"name": "Aldric"}))

    assert error(member.put(f"/events/{event['id']}/helpers", {"user_ids": [player.user_id]}), 400) == (
        "not_on_roster"
    )
    # Staff join the roster once they have a profile.
    assert error(member.put(f"/events/{event['id']}/helpers", {"user_ids": [staff.user_id]}), 400) == (
        "not_on_roster"
    )
    ok(staff.put("/me/settings", {"timezone": "Europe/Amsterdam"}))
    detail = ok(member.put(f"/events/{event['id']}/helpers", {"user_ids": [other.user_id, staff.user_id]}))
    assert {h["user_id"] for h in detail["helpers"]} == {other.user_id, staff.user_id}

    detail = ok(member.put(f"/events/{event['id']}/characters", {"character_ids": [aldric["id"]]}))
    assert [c["id"] for c in detail["characters"]] == [aldric["id"]]
    assert [e["id"] for e in ok(member.get(f"/characters/{aldric['id']}"))["events"]] == [event["id"]]


def test_skin_upload_and_face(client):
    member = Person(client, "helper", member=True)
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    assert member.get(f"/characters/{aldric['id']}/face.png").status_code == 404

    member._use()
    response = client.post(f"/lore/characters/{aldric['id']}/skin", headers=ORIGIN,
                           files={"skin": ("skin.png", skin_png(), "image/png")})
    assert ok(response)["has_face"] is True and ok(response)["has_skin"] is True
    face = member.get(f"/characters/{aldric['id']}/face.png")
    assert face.status_code == 200 and face.headers["content-type"] == "image/png"
    assert face.headers["cache-control"] == "private, max-age=300"
    image = Image.open(io.BytesIO(face.content))
    assert image.size == (64, 64) and image.convert("RGBA").getpixel((10, 10)) == (200, 30, 30, 255)

    bad = client.post(f"/lore/characters/{aldric['id']}/skin", headers=ORIGIN,
                      files={"skin": ("skin.png", b"not a png", "image/png")})
    assert error(bad, 400) == "bad_skin"

    ok(member.delete(f"/characters/{aldric['id']}/skin"))
    assert member.get(f"/characters/{aldric['id']}/face.png").status_code == 404


def test_link_player(client):
    member = Person(client, "helper", member=True)
    Person(client, "linked", minecraft="SirAldric")
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    detail = ok(member.put(f"/characters/{aldric['id']}/player", {"name": "siraldric"}))
    assert detail["player_name"] == "SirAldric" and detail["has_face"] is True and detail["has_skin"] is False
    assert error(member.put(f"/characters/{aldric['id']}/player", {"name": "Nobody"}), 400) == (
        "unknown_player"
    )
    detail = ok(member.put(f"/characters/{aldric['id']}/player", {"name": None}))
    assert detail["player_name"] is None and detail["has_face"] is False


# --------------------
# Availability and calendar
# --------------------


def _monday_after(day: date) -> date:
    return day + timedelta(days=7 - day.weekday())


def test_availability_weekly_overrides_and_grid(client):
    member = Person(client, "helper", member=True)
    other = Person(client, "helper2", member=True)
    monday = _monday_after(TODAY)
    weekly = [{"status": "full", "note": ""}] * 5 + [{"status": "none", "note": "away"}, {"status": None, "note": ""}]
    ok(member.put("/availability/me/weekly", {"weekly": weekly}))
    ok(member.put("/availability/me/days", {"days": [{"day": monday.isoformat(), "status": "partial",
                                                       "note": "evening only"}]}))

    sunday = monday + timedelta(days=6)
    mine = ok(member.get(f"/availability/me?from={monday}&to={sunday}"))
    shown = [(d["status"], d["source"]) for d in mine["days"]]
    assert shown == [("partial", "override")] + [("full", "weekly")] * 4 + [("none", "weekly"), (None, None)]
    assert mine["settings"]["on_roster"] is True

    grid = ok(other.get(f"/availability?from={monday}&to={sunday}"))
    rows = {p["user_id"]: p for p in grid["people"]}
    assert rows[member.user_id]["days"][monday.isoformat()]["note"] == "evening only"
    assert all(v["status"] is None for v in rows[other.user_id]["days"].values())

    day = ok(other.get(f"/availability/day/{monday}"))["people"]
    assert {p["user_id"]: p["status"] for p in day}[member.user_id] == "partial"

    # A null status removes the override again.
    ok(member.put("/availability/me/days", {"days": [{"day": monday.isoformat(), "status": None}]}))
    mine = ok(member.get(f"/availability/me?from={monday}&to={monday}"))
    assert mine["days"][0]["source"] == "weekly"


def test_availability_limits(client):
    member = Person(client, "helper", member=True)
    far = TODAY + timedelta(days=100)
    assert error(member.get(f"/availability?from={TODAY}&to={far}"), 400) == "range_too_long"
    assert error(member.get(f"/availability?from={TODAY}&to={TODAY - timedelta(days=1)}"), 400) == "bad_range"
    assert error(member.put("/availability/me/weekly", {"weekly": [{"status": "full"}]}), 400)
    assert error(member.put("/availability/me/days", {"days": [{"day": "tomorrow", "status": "full"}]}), 400)
    assert error(member.put("/me/settings", {"timezone": "Mars/Olympus"}), 400) == "bad_timezone"
    assert error(member.put("/me/settings", {"notify_mode": "loud"}), 400) == "bad_notify_mode"
    settings = ok(member.put("/me/settings", {"timezone": "America/New_York", "notify_mode": "all"}))
    assert settings["timezone"] == "America/New_York" and settings["notify_mode"] == "all"


def test_staff_join_roster_with_a_profile(client):
    staff = Person(client, "mod", role="mod")
    member = Person(client, "helper", member=True)
    grid = ok(member.get(f"/availability?from={TODAY}&to={TODAY}"))
    assert [p["user_id"] for p in grid["people"]] == [member.user_id]
    assert ok(staff.get(f"/availability/me?from={TODAY}&to={TODAY}"))["settings"]["on_roster"] is False
    ok(staff.put("/availability/me/weekly", {"weekly": [{"status": "full", "note": ""}] * 7}))
    grid = ok(member.get(f"/availability?from={TODAY}&to={TODAY}"))
    assert {p["user_id"] for p in grid["people"]} == {member.user_id, staff.user_id}


def test_overview_today_follows_the_viewer(client):
    member = Person(client, "helper", member=True)
    utc_today = datetime.now(UTC).date()
    tomorrow = (utc_today + timedelta(days=1)).isoformat()
    assert ok(member.get("/overview"))["today"] == utc_today.isoformat()
    assert ok(member.get(f"/overview?today={tomorrow}"))["today"] == tomorrow
    far = (utc_today + timedelta(days=5)).isoformat()
    assert ok(member.get(f"/overview?today={far}"))["today"] == utc_today.isoformat()
    assert error(member.get("/overview?today=soon"), 400) == "bad_day"

    ok(member.put("/me/settings", {"timezone": "Pacific/Kiritimati"}))
    zoned = datetime.now(ZoneInfo("Pacific/Kiritimati")).date().isoformat()
    assert ok(member.get(f"/overview?today={utc_today.isoformat()}"))["today"] == zoned


def test_calendar_and_overview(client):
    member = Person(client, "helper", member=True)
    story = ok(member.post("/storylines", {"title": "The Fall"}))
    keep = ok(member.post("/locations", {"name": "Old Keep", "x": 1, "y": 70, "z": 2}))
    soon = TODAY + timedelta(days=3)
    scheduled = ok(member.post("/events", {"title": "Ambush", "status": "scheduled", "scheduled_on": soon.isoformat(),
                                           "storyline_id": story["id"], "location_id": keep["id"]}))
    ok(member.post("/events", {"title": "Someday", "status": "waiting", "waiting_on": "Map build"}))
    ok(member.post("/events", {"title": "Gone", "status": "cancelled"}))

    calendar = ok(member.get(f"/calendar?from={TODAY}&to={TODAY + timedelta(days=13)}"))
    assert [(e["id"], e["storyline"]["label"], e["location"]["x"]) for e in calendar["events"]] == [
        (scheduled["id"], "The Fall", 1)
    ]
    assert [(e["title"], e["waiting_on"]) for e in calendar["unscheduled"]] == [("Someday", "Map build")]
    assert [p["user_id"] for p in calendar["availability"]["people"]] == [member.user_id]

    overview = ok(member.get("/overview"))
    assert [e["id"] for e in overview["upcoming"]] == [scheduled["id"]]
    assert overview["unscheduled_total"] == 1
    assert len(overview["my_week"]) == 7
    assert overview["recent"][0]["target"]["label"] == "Gone"


# --------------------
# Team
# --------------------


def test_team_management(client):
    staff = Person(client, "mod", role="mod")
    lead = Person(client, "lead", member=True, lead=True)
    helper = Person(client, "helper", member=True)
    newcomer = Person(client, "shaymin_fan")

    assert error(helper.post("/team", {"user_id": newcomer.user_id}), 403) == "forbidden"
    assert error(helper.get("/team/candidates?q=sha"), 403) == "forbidden"
    candidates = ok(lead.get("/team/candidates?q=sha"))["candidates"]
    assert [c["user_id"] for c in candidates] == [newcomer.user_id]

    added = ok(lead.post("/team", {"user_id": newcomer.user_id}))
    assert added["is_lead"] is False and added["added_by"] == lead.user_id
    assert error(lead.post("/team", {"user_id": newcomer.user_id}), 409) == "already_member"
    assert ok(newcomer.get("/access"))["access"] is True

    assert error(lead.patch(f"/team/{lead.user_id}", {"is_lead": False}), 403) == "cannot_change_self"
    assert error(lead.delete(f"/team/{lead.user_id}"), 403) == "cannot_change_self"
    ok(staff.patch(f"/team/{newcomer.user_id}", {"is_lead": True}))

    team = ok(helper.get("/team"))
    assert {m["user_id"]: m["is_lead"] for m in team["members"]} == {
        lead.user_id: True, helper.user_id: False, newcomer.user_id: True
    }
    assert team["staff"] == []  # staff appear once they join the roster

    ok(staff.delete(f"/team/{newcomer.user_id}"))
    assert ok(newcomer.get("/access"))["access"] is False
    assert newcomer.get("/characters").status_code == 403

    recent = ok(staff.get("/overview"))["recent"]
    assert [(r["entity_kind"], r["action"], r["target"]["label"]) for r in recent[:3]] == [
        ("team", "removed", "shaymin_fan"), ("team", "updated", "shaymin_fan"), ("team", "added", "shaymin_fan")
    ]


def test_team_head_is_only_for_roster(client):
    member = Person(client, "helper", member=True)
    player = Person(client, "player", minecraft="Someone")
    assert member.get(f"/team/{player.user_id}/head.png").status_code == 404


# --------------------
# Notifications (the bot's outbox)
# --------------------


def _poll(client, limit=50):
    return ok(client.get(f"/lore/staff/notifications?limit={limit}", headers=STAFF_KEY))["notifications"]


def test_notifications_need_staff_key(client):
    assert client.get("/lore/staff/notifications").status_code == 401
    assert client.post("/lore/staff/notifications/ack", json={"ids": []}).status_code == 401


def test_notifications_by_mode_reschedule_cancel(client):
    lead = Person(client, "lead", member=True, lead=True)
    available = Person(client, "available", member=True)
    busy = Person(client, "busy", member=True)
    everything = Person(client, "everything", member=True)
    quiet = Person(client, "quiet", member=True)
    day = TODAY + timedelta(days=5)
    later = day + timedelta(days=1)
    ok(available.put("/availability/me/days", {"days": [{"day": day.isoformat(), "status": "full"},
                                                         {"day": later.isoformat(), "status": "none"}]}))
    ok(busy.put("/availability/me/days", {"days": [{"day": day.isoformat(), "status": "none"},
                                                    {"day": later.isoformat(), "status": "partial"}]}))
    ok(everything.put("/me/settings", {"notify_mode": "all"}))
    ok(quiet.put("/me/settings", {"notify_mode": "off"}))
    ok(quiet.put("/availability/me/days", {"days": [{"day": day.isoformat(), "status": "full"}]}))

    event = ok(lead.post("/events", {"title": "Ambush", "status": "idea"}))
    assert _poll(client) == []
    ok(lead.patch(f"/events/{event['id']}", {"status": "scheduled", "scheduled_on": day.isoformat(), "version": 1}))
    sent = _poll(client)
    assert {(n["kind"], n["discord_user_id"]) for n in sent} == {
        ("event_scheduled", available.discord_id), ("event_scheduled", everything.discord_id)
    }
    assert sent[0]["payload"]["title"] == "Ambush"
    assert _poll(client) == []  # handed out; not offered again within ten minutes
    acked = ok(client.post("/lore/staff/notifications/ack", headers=STAFF_KEY,
                           json={"ids": [n["id"] for n in sent] + [999999]}))["acked"]
    assert acked == sorted(n["id"] for n in sent)

    # Editing the summary alone tells nobody.
    ok(lead.patch(f"/events/{event['id']}", {"summary": "More detail", "version": 2}))
    assert _poll(client) == []

    # Moving it tells those available on the new day and everyone already told.
    ok(lead.patch(f"/events/{event['id']}", {"scheduled_on": later.isoformat(), "version": 3}))
    moved = _poll(client)
    assert {(n["kind"], n["discord_user_id"]) for n in moved} == {
        ("event_rescheduled", available.discord_id), ("event_rescheduled", busy.discord_id),
        ("event_rescheduled", everything.discord_id),
    }
    assert moved[0]["payload"]["previous_day"] == day.isoformat()

    # A new helper hears about it once.
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": [quiet.user_id, lead.user_id]}))
    assert [(n["kind"], n["discord_user_id"]) for n in _poll(client)] == [("event_scheduled", lead.discord_id)]

    ok(lead.patch(f"/events/{event['id']}", {"status": "cancelled", "version": 4}))
    cancelled = _poll(client)
    assert {n["discord_user_id"] for n in cancelled} == {
        available.discord_id, busy.discord_id, everything.discord_id, lead.discord_id
    }
    assert {n["kind"] for n in cancelled} == {"event_cancelled"}
    assert cancelled[0]["payload"]["reason"] == "cancelled"


def test_marking_done_sends_nothing(client):
    lead = Person(client, "lead", member=True)
    ok(lead.put("/me/settings", {"notify_mode": "all"}))
    event = ok(lead.post("/events", {"title": "Feast", "status": "scheduled", "scheduled_on": TODAY.isoformat()}))
    assert [n["kind"] for n in _poll(client)] == ["event_scheduled"]
    ok(lead.patch(f"/events/{event['id']}", {"status": "done", "outcome": "Fun", "version": 1}))
    assert _poll(client) == []
    ok(lead.delete(f"/events/{event['id']}"))
    assert _poll(client) == []
