"""The lore panel API (/lore) against Postgres: access, records, links, availability, team, bot outbox."""
from __future__ import annotations

import io
import os
from contextlib import contextmanager
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
from src.lore import team as lore_team  # noqa: E402

pytestmark = pytest.mark.usefixtures("postgres")

STAFF_KEY = {"X-Staff-Key": "dev-staff-key"}
SITE = "https://site.example"
ORIGIN = {"Origin": SITE}
COOKIE = "__Host-tfmc_session"
TODAY = date.today()


@pytest.fixture
def client(monkeypatch):
    for name in ("PLUGIN_KEY", "STAFF_KEY", "PS_PRODUCTION", "SIGN_IN_SITE", "LORE_PANEL", "PUBLIC_SITE_URL",
                 "PROFILE_REALM_ID"):
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
    def __init__(self, client: TestClient, name: str, *, role: str = "player", lore_helper: bool = False,
                 helper: bool = False, minecraft: str | None = None):
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
            for discord_role, present in (("lore_helper", lore_helper), ("helper", helper)):
                if present:
                    conn.execute(
                        "INSERT INTO lore_discord_roles (discord_user_id, role) VALUES (%s, %s)",
                        (self.discord_id, discord_role),
                    )
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
                                                "level": None, "user": None}
    player = Person(client, "player")
    body = ok(player.get("/access"))
    assert body["signed_in"] is True and body["access"] is False and body["level"] is None and body["user"] is None


@pytest.mark.parametrize(("role", "lore_helper", "helper", "level"), [
    ("player", False, True, "calendar"),
    ("player", True, False, "full"),
    ("player", True, True, "full"),
    ("mod", False, False, "full"),
    ("mod", False, True, "full"),
])
def test_viewer_levels(client, role, lore_helper, helper, level):
    user = Person(client, "viewer", role=role, lore_helper=lore_helper, helper=helper)
    assert ok(user.get("/access")) == {
        "enabled": True, "signed_in": True, "access": True, "level": level,
        "user": {
            "user_id": user.user_id, "name": "viewer", "is_staff": role == "mod",
            "is_lore_helper": lore_helper, "is_helper": helper,
        },
    }


def test_reads_need_access(client):
    client.cookies.clear()
    assert error(client.get("/lore/characters"), 401) == "not_signed_in"
    player = Person(client, "player")
    assert error(player.get("/characters"), 403) == "no_access"
    assert error(player.post("/characters", {"name": "X"}), 403) == "no_access"


def test_all_lore_routes_enforce_calendar_allowlist(client):
    helper = Person(client, "helper", helper=True)
    player = Person(client, "player")
    allowed = {
        ("GET", "/lore/access"),
        ("GET", "/lore/calendar"),
        ("GET", "/lore/availability/me"),
        ("PUT", "/lore/availability/me/weekly"),
        ("PUT", "/lore/availability/me/days"),
        ("PUT", "/lore/me/settings"),
        ("GET", "/lore/availability"),
        ("GET", "/lore/availability/day/{day}"),
        ("GET", "/lore/team/{user_id}/head.png"),
        ("PUT", "/lore/events/{event_id}/signup"),
        ("DELETE", "/lore/events/{event_id}/signup"),
    }
    bot_only = {
        ("GET", "/lore/staff/notifications"),
        ("POST", "/lore/staff/notifications/ack"),
        ("PUT", "/lore/staff/discord-roles"),
    }
    def walk(router, prefix=""):
        for route in router.routes:
            if hasattr(route, "original_router"):
                # Newer FastAPI versions keep included routers nested.
                yield from walk(route.original_router, prefix + route.include_context.prefix)
            else:
                yield prefix + route.path, route

    visited = set()
    for path, route in walk(lore_router):
        for method in route.methods:
            key = (method, path)
            visited.add(key)
            url = path
            for name in route.param_convertors:
                url = url.replace("{" + name + "}", TODAY.isoformat() if name == "day" else "1")
            kwargs = {"headers": ORIGIN}
            if path == "/lore/characters/{character_id}/skin" and method == "POST":
                kwargs["files"] = {"skin": ("skin.png", skin_png(), "image/png")}
            elif method in ("POST", "PATCH", "PUT"):
                kwargs["json"] = {}
            if key in bot_only:
                assert helper._use().request(method, url, **kwargs).status_code == 401, key
            elif key not in allowed:
                assert error(helper._use().request(method, url, **kwargs), 403) == "lore_helpers_only", key
                assert error(player._use().request(method, url, **kwargs), 403) == "no_access", key
    assert allowed | bot_only <= visited


def test_writes_need_same_origin(client):
    member = Person(client, "helper", lore_helper=True)
    member._use()
    response = client.post("/lore/characters", json={"name": "X"}, headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


@pytest.mark.parametrize("env", [{"PS_PRODUCTION": "1"}, {"LORE_PANEL": "off"}])
def test_flag_off_hides_everything(client, monkeypatch, env):
    member = Person(client, "helper", lore_helper=True)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    assert ok(member.get("/access")) == {"enabled": False, "signed_in": False, "access": False,
                                         "level": None, "user": None}
    assert member.get("/characters").status_code == 404
    assert member.get("/overview").status_code == 404
    assert client.get("/lore/staff/notifications", headers=STAFF_KEY).status_code == 404


def test_flag_on_in_production_when_set(client, monkeypatch):
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
    assert error(member.post("/characters", {"name": "  "}), 400) == "name_required"
    assert error(member.post("/characters", {"name": "A", "status": "zombie"}), 400) == "bad_status"
    assert error(member.post("/events", {"title": "E", "status": "scheduled"}), 400) == "date_required"
    assert error(member.post("/events", {"title": "E", "status": "waiting"}), 400) == "waiting_on_required"
    assert error(member.post("/events", {"title": "E", "storyline_id": 999}), 400) == "bad_storyline_id"
    assert error(member.post("/events", {"title": "E", "starts_at": "2026-01-01T10:00"}), 400) == (
        "bad_starts_at"
    )
    assert error(member.post("/locations", {"name": "L", "x": 10**9}), 400) == "bad_x"
    assert error(member.post("/locations", {"name": "L", "world": "  "}), 400) == "bad_world"
    assert ok(member.post("/locations", {"name": "L", "world": " TFMC_Map "}))["world"] == "TFMC_Map"
    assert member.get("/characters/0").status_code == 422
    assert error(member.get("/characters/12345"), 404) == "not_found"


def test_list_filters_and_search(client):
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
    other = Person(client, "helper2", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="SirAldric")
    aldric = ok(member.post("/characters", {"name": "Aldric"}))
    detail = ok(member.put(f"/characters/{aldric['id']}/player", {"name": "siraldric"}))
    assert detail["player_name"] == "SirAldric" and detail["has_face"] is True and detail["has_skin"] is False
    assert error(member.put(f"/characters/{aldric['id']}/player", {"name": "Nobody"}), 400) == (
        "unknown_player"
    )
    detail = ok(member.put(f"/characters/{aldric['id']}/player", {"name": None}))
    assert detail["player_name"] is None and detail["has_face"] is False


def roster_character(player_uuid, character_id, name, *, status="ALIVE", realm="main"):
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO character_roster (player_uuid, realm_id, character_id, name, status, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, now())",
            (player_uuid, realm, character_id, name, status),
        )


def player_uuid_of(minecraft):
    with database.connect() as conn:
        return conn.execute(
            "SELECT player_uuid FROM discord_links WHERE minecraft_name = %s", (minecraft,)
        ).fetchone()["player_uuid"]


def test_search_finds_player_characters_only_when_asked(client):
    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="Tamsin")
    uuid = player_uuid_of("Tamsin")
    roster_character(uuid, "c1", "Brannoc Vale")
    roster_character(uuid, "c2", "Brannoc the Dead", status="DEAD")
    roster_character(uuid, "c3", "Brannoc Elsewhere", realm="tutorial")
    ok(member.post("/characters", {"name": "Brannoc"}))

    plain = ok(member.get("/search?q=brannoc&kinds=character"))["results"]
    assert [r["label"] for r in plain] == ["Brannoc"]

    found = ok(member.get("/search?q=brannoc&kinds=character&players=true"))["results"]
    assert [(r["label"], r["id"] > 0) for r in found] == [
        ("Brannoc", True), ("Brannoc the Dead", False), ("Brannoc Vale", False),
    ]
    dead, vale = found[1], found[2]
    assert dead["status"] == "dead" and dead["sublabel"] == "Tamsin"
    assert vale == {"kind": "character", "id": 0, "label": "Brannoc Vale", "sublabel": "Tamsin",
                    "status": "active", "player": {"uuid": uuid, "character_id": "c1"}}

    # Not when characters aren't wanted.
    assert ok(member.get("/search?q=brannoc&kinds=organisation&players=true"))["results"] == []


def test_empty_search_lists_player_characters_after_lore_records(client):
    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="Tamsin")
    uuid = player_uuid_of("Tamsin")
    roster_character(uuid, "c1", "Brannoc the Dead", status="DEAD")
    roster_character(uuid, "c2", "Brannoc Vale")
    roster_character(uuid, "c3", "Brannoc Elsewhere", realm="tutorial")
    ok(member.post("/characters", {"name": "Aldric"}))
    ok(member.post("/organisations", {"name": "Iron Guild"}))

    listed = ok(member.get("/search?kinds=character,organisation&players=true"))["results"]
    assert [r["label"] for r in listed] == ["Iron Guild", "Aldric", "Brannoc Vale", "Brannoc the Dead"]
    assert ok(member.get("/search?kinds=character,organisation&players=true&limit=2"))["results"] == listed[:2]

    # Only when asked.
    assert all("player" not in r for r in ok(member.get("/search?kinds=character"))["results"])


def test_player_characters_come_from_the_sites_realm(client, monkeypatch):
    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="Tamsin")
    uuid = player_uuid_of("Tamsin")
    roster_character(uuid, "c1", "Brannoc Main")
    roster_character(uuid, "c2", "Brannoc Dev", realm="dev")
    monkeypatch.setenv("PROFILE_REALM_ID", "dev")

    found = ok(member.get("/search?q=brannoc&kinds=character&players=true"))["results"]
    assert [r["label"] for r in found] == ["Brannoc Dev"]
    assert error(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}), 400) == (
        "unknown_player_character"
    )
    made = ok(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c2"}))
    detail = ok(member.get(f"/characters/{made['id']}"))
    assert detail["rpc_realm_id"] == "dev" and detail["player_character"]["name"] == "Brannoc Dev"


def test_adopt_player_character(client):
    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="Tamsin")
    uuid = player_uuid_of("Tamsin")
    roster_character(uuid, "c1", "Brannoc Vale", status="DEAD")

    made = ok(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}))
    assert made["created"] is True and made["label"] == "Brannoc Vale" and made["status"] == "dead"
    assert made["sublabel"] == "Tamsin" and made["id"] > 0
    again = ok(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}))
    assert again["created"] is False and again["id"] == made["id"]

    # Now a lore character, it stands in for the roster entry in search.
    found = ok(member.get("/search?q=brannoc&kinds=character&players=true"))["results"]
    assert [(r["id"], "player" in r) for r in found] == [(made["id"], False)]

    detail = ok(member.get(f"/characters/{made['id']}"))
    assert detail["player_name"] == "Tamsin" and detail["rpc_character_id"] == "c1"
    assert detail["player_character"]["name"] == "Brannoc Vale" and detail["player_character"]["status"] == "DEAD"
    assert detail["has_face"] is True
    history = ok(member.get(f"/characters/{made['id']}/history"))
    assert history["history"][-1]["action"] == "created"

    # The roster fixes the player.
    assert error(member.put(f"/characters/{made['id']}/player", {"name": None}), 409) == "player_character_linked"

    # The list tells player characters from the lore team's own.
    npc = ok(member.post("/characters", {"name": "Old Hask"}))
    flags = {row["id"]: row["is_player_character"] for row in ok(member.get("/characters"))["items"]}
    assert flags == {made["id"]: True, npc["id"]: False}

    # Usable as any character, e.g. in a storyline.
    storyline = ok(member.post("/storylines", {"title": "The Vale"}))
    ok(member.put(f"/storylines/{storyline['id']}/members",
                  {"members": [{"kind": "character", "id": made["id"]}]}))

    # A deleted one is restored, not made again.
    ok(member.delete(f"/characters/{made['id']}"))
    assert error(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}), 409) == (
        "player_character_deleted"
    )
    assert ok(member.get("/search?q=brannoc&kinds=character&players=true"))["results"][0]["player"] == {
        "uuid": uuid, "character_id": "c1",
    }

    assert error(member.post("/player-characters", {"player_uuid": uuid, "character_id": "nope"}), 400) == (
        "unknown_player_character"
    )
    assert error(member.post("/player-characters", {"player_uuid": uuid}), 400) == "bad_player_character"
    outsider = Person(client, "outsider")
    assert outsider.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}).status_code in (
        401, 403,
    )


def test_player_character_face_is_its_worn_skin(client, monkeypatch):
    from src.lore import links

    member = Person(client, "helper", lore_helper=True)
    Person(client, "linked", minecraft="Tamsin")
    uuid = player_uuid_of("Tamsin")
    roster_character(uuid, "c1", "Brannoc Vale")
    made = ok(member.post("/player-characters", {"player_uuid": uuid, "character_id": "c1"}))
    face = Image.new("RGBA", (8, 8), (20, 90, 200, 255))
    buf = io.BytesIO()
    face.save(buf, format="PNG")
    seen = []
    monkeypatch.setattr(links, "active_face_png",
                        lambda player, character, realm_id=None: seen.append((player, character, realm_id))
                        or buf.getvalue())
    response = member.get(f"/characters/{made['id']}/face.png")
    assert response.status_code == 200 and seen == [(uuid, "c1", "main")]
    image = Image.open(io.BytesIO(response.content))
    assert image.size == (64, 64) and image.convert("RGBA").getpixel((5, 5)) == (20, 90, 200, 255)


# --------------------
# Availability and calendar
# --------------------


def _monday_after(day: date) -> date:
    return day + timedelta(days=7 - day.weekday())


def test_availability_weekly_overrides_and_grid(client):
    member = Person(client, "helper", lore_helper=True)
    other = Person(client, "helper2", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
    grid = ok(member.get(f"/availability?from={TODAY}&to={TODAY}"))
    assert [p["user_id"] for p in grid["people"]] == [member.user_id]
    assert ok(staff.get(f"/availability/me?from={TODAY}&to={TODAY}"))["settings"]["on_roster"] is False
    ok(staff.put("/availability/me/weekly", {"weekly": [{"status": "full", "note": ""}] * 7}))
    grid = ok(member.get(f"/availability?from={TODAY}&to={TODAY}"))
    assert {p["user_id"] for p in grid["people"]} == {member.user_id, staff.user_id}


def test_overview_today_follows_the_viewer(client):
    member = Person(client, "helper", lore_helper=True)
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
    member = Person(client, "helper", lore_helper=True)
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


def test_helper_calendar_and_day_availability_redact_lore(client):
    lore_helper = Person(client, "lore-helper", lore_helper=True)
    helper = Person(client, "helper", helper=True)
    day = TODAY.isoformat()
    query = f"?from={day}&to={day}"
    ok(lore_helper.put("/availability/me/days", {
        "days": [{"day": day, "status": "full", "note": "Preparing the story reveal"}],
    }))
    story = ok(lore_helper.post("/storylines", {"title": "Secret plot"}))
    location = ok(lore_helper.post("/locations", {"name": "Old Keep", "x": 1, "z": 2}))
    event = ok(lore_helper.post("/events", {
        "title": "Ambush", "status": "scheduled", "scheduled_on": day, "summary": "Secret summary",
        "notes": "Secret notes", "storyline_id": story["id"], "location_id": location["id"],
    }))
    ok(lore_helper.put(f"/events/{event['id']}/helpers", {"user_ids": [lore_helper.user_id]}))
    done = ok(lore_helper.post("/events", {"title": "Feast", "status": "done", "scheduled_on": day}))
    ok(lore_helper.post("/events", {"title": "Hidden idea"}))
    ok(lore_helper.post("/events", {"title": "Cancelled", "status": "cancelled", "scheduled_on": day}))

    helpers = ok(lore_helper.get(f"/events/{event['id']}"))["helpers"]
    assert [h["user_id"] for h in helpers] == [lore_helper.user_id]
    calendar = ok(helper.get("/calendar" + query))
    assert calendar["events"] == [
        {
            "id": event["id"], "title": "Ambush", "status": "scheduled", "scheduled_on": day,
            "starts_at": None, "helper_ids": [lore_helper.user_id], "helpers": helpers, "storyline": None,
            "location": {"label": "Old Keep"},
        },
        {
            "id": done["id"], "title": "Feast", "status": "done", "scheduled_on": day,
            "starts_at": None, "helper_ids": [], "helpers": [], "storyline": None, "location": None,
        },
    ]
    assert calendar["unscheduled"] == []
    # The Helper is on the roster too, without having set anything.
    by_user = {p["user_id"]: p for p in calendar["availability"]["people"]}
    assert set(by_user) == {lore_helper.user_id, helper.user_id}
    assert by_user[lore_helper.user_id]["days"][day]["note"] == ""
    assert ok(helper.get("/availability" + query)) == calendar["availability"]

    def day_note(viewer):
        people = ok(viewer.get(f"/availability/day/{day}"))["people"]
        return {p["user_id"]: p["note"] for p in people}[lore_helper.user_id]

    assert day_note(helper) == ""
    assert day_note(lore_helper) == "Preparing the story reveal"
    own = ok(helper.put("/availability/me/days", {
        "days": [{"day": day, "status": "partial", "note": "After dinner"}],
    }))
    assert own["days"][0]["note"] == "After dinner"
    assert own["settings"]["notify_mode"] == "assigned"
    for mode in ("off", "assigned", "available", "all"):
        assert ok(helper.put("/me/settings", {"notify_mode": mode}))["notify_mode"] == mode


# --------------------
# Team
# --------------------


def _sync(client, helper=(), lore_helper=()):
    return client.put(
        "/lore/staff/discord-roles", json={"helper": list(helper), "lore_helper": list(lore_helper)}, headers=STAFF_KEY
    )


def test_team_roster_and_role_loss(client):
    staff = Person(client, "mod", role="mod", helper=True)
    lore_helper = Person(client, "lore-helper", lore_helper=True, helper=True)
    helper = Person(client, "helper", helper=True)
    staff_lore = Person(client, "mod-lore", role="mod", lore_helper=True)
    placeholder = Person(client, "placeholder", lore_helper=True)
    with database.connect() as conn:
        conn.execute("UPDATE users SET placeholder = true WHERE id = %s", (placeholder.user_id,))
    missing = "123456"
    sync = ok(_sync(
        client,
        helper=[staff.discord_id, lore_helper.discord_id, helper.discord_id, missing],
        lore_helper=[lore_helper.discord_id, staff_lore.discord_id, placeholder.discord_id, missing],
    ))

    def groups():
        team = ok(staff.get("/team"))
        assert team["unlinked"] == 2
        assert team["synced_at"] == sync["synced_at"]
        return {
            name: [(p["user_id"], p["level"], p["lore_role"], p["notify_mode"]) for p in team[name]]
            for name in ("lore_helpers", "helpers", "staff")
        }

    # Helpers are on the roster from their first sign-in, like Lore Helpers; so are staff holding either role.
    assert groups() == {
        "lore_helpers": [(lore_helper.user_id, "full", "lore_helper", "available")],
        "helpers": [(helper.user_id, "calendar", "helper", "assigned")],
        "staff": sorted([(staff.user_id, "full", "staff", "available"),
                         (staff_lore.user_id, "full", "staff", "available")], key=lambda row: row[0]),
    }
    assert ok(helper.get(f"/availability/me?from={TODAY}&to={TODAY}"))["settings"] == {
        "notify_mode": "assigned", "timezone": None, "on_roster": True,
    }
    ok(helper.put("/availability/me/weekly", {"weekly": [{}] * 7}))
    assert ok(staff.put("/me/settings", {}))["notify_mode"] == "available"
    assert groups()["helpers"] == [(helper.user_id, "calendar", "helper", "assigned")]

    event = ok(staff.post("/events", {"title": "Feast"}))
    ok(staff.put(f"/events/{event['id']}/helpers", {"user_ids": [helper.user_id, lore_helper.user_id]}))
    ok(_sync(client, helper=[lore_helper.discord_id]))
    assert ok(helper.get("/access"))["level"] is None
    assert ok(lore_helper.get("/access"))["level"] == "calendar"
    team = ok(staff.get("/team"))
    assert team["lore_helpers"] == []
    assert [p["user_id"] for p in team["helpers"]] == [lore_helper.user_id]
    assert {p["user_id"] for p in ok(staff.get(f"/events/{event['id']}"))["helpers"]} == {
        helper.user_id, lore_helper.user_id,
    }


def test_legacy_team_history_still_appears(client):
    staff = Person(client, "mod", role="mod")
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO lore_history (entity_kind, entity_id, action, actor_name, changes) "
            "VALUES ('team', 42, 'removed', 'mod', %s)",
            (database.Jsonb({"name": ["shaymin_fan", None]}),),
        )
    recent = ok(staff.get("/overview"))["recent"]
    assert [(r["entity_kind"], r["action"], r["target"]["label"]) for r in recent] == [
        ("team", "removed", "shaymin_fan"),
    ]


def test_discord_role_sync_requires_key_and_bypasses_flag(client, monkeypatch):
    monkeypatch.setenv("LORE_PANEL", "off")
    path = "/lore/staff/discord-roles"
    payload = {"helper": [], "lore_helper": []}
    assert client.put(path, json=payload).status_code == 401
    assert client.put(path, json=payload, headers={"X-Staff-Key": "wrong"}).status_code == 401
    with database.connect() as conn:
        assert conn.execute("SELECT * FROM lore_discord_role_sync").fetchall() == []
    body = ok(_sync(client, helper=["1", "1", "2"], lore_helper=["2", "3"]))
    first_sync = datetime.fromisoformat(body.pop("synced_at"))
    assert first_sync.tzinfo is not None
    assert body == {"helper": 2, "lore_helper": 2, "added": 4, "removed": 0}

    body = ok(_sync(client, helper=["1", "3"], lore_helper=["2"]))
    assert datetime.fromisoformat(body.pop("synced_at")) >= first_sync
    assert body == {"helper": 2, "lore_helper": 1, "added": 1, "removed": 2}
    with database.connect() as conn:
        assert {(r["discord_user_id"], r["role"]) for r in conn.execute("SELECT * FROM lore_discord_roles")} == {
            ("1", "helper"), ("3", "helper"), ("2", "lore_helper"),
        }
    repeated = ok(_sync(client, helper=["1", "3"], lore_helper=["2"]))
    assert repeated["added"] == repeated["removed"] == 0
    assert ok(_sync(client))["removed"] == 3


@pytest.mark.parametrize("payload", [
    [], {}, {"helper": []}, {"helper": [], "lore_helper": [], "other": []},
    {"helper": "123", "lore_helper": []}, {"helper": [123], "lore_helper": []},
    {"helper": [], "lore_helper": ["123\n"]}, {"helper": [""], "lore_helper": []},
    {"helper": ["１２３"], "lore_helper": []}, {"helper": ["1" * 21], "lore_helper": []},
    {"helper": [], "lore_helper": ["1"] * 10_001},
])
def test_invalid_discord_role_snapshot(client, payload):
    assert error(client.put("/lore/staff/discord-roles", json=payload, headers=STAFF_KEY), 400) == "bad_discord_roles"


def test_largest_discord_role_snapshot(client):
    ids = [str(10**19 + i) for i in range(10_000)]
    result = ok(_sync(client, helper=ids, lore_helper=ids))
    assert result["added"] == 20_000


def test_snapshot_rolls_back_roles_and_timestamp_together(client, monkeypatch):
    first = ok(_sync(client, helper=["1"]))
    original = database.transaction

    @contextmanager
    def abort_commit(**kwargs):
        with original(**kwargs) as conn:
            yield conn
            raise RuntimeError("abort commit")

    monkeypatch.setattr(database, "transaction", abort_commit)
    with pytest.raises(RuntimeError, match="abort commit"):
        lore_team.sync_discord_roles({"helper": [], "lore_helper": ["2"]})
    with database.connect() as conn:
        assert conn.execute("SELECT * FROM lore_discord_roles").fetchall() == [
            {"discord_user_id": "1", "role": "helper"},
        ]
        assert conn.execute("SELECT synced_at FROM lore_discord_role_sync").fetchone() == {
            "synced_at": datetime.fromisoformat(first["synced_at"]),
        }


def test_team_head_is_only_for_roster(client):
    member = Person(client, "helper", lore_helper=True)
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
    lead = Person(client, "lead", lore_helper=True)
    available = Person(client, "available", lore_helper=True)
    busy = Person(client, "busy", lore_helper=True)
    everything = Person(client, "everything", lore_helper=True)
    quiet = Person(client, "quiet", lore_helper=True)
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


def test_rescheduling_after_cancel_queues_fresh_rows(client):
    lead = Person(client, "lead", lore_helper=True)
    helper = Person(client, "helper", lore_helper=True)
    ok(lead.put("/me/settings", {"notify_mode": "all"}))
    day = TODAY + timedelta(days=3)
    event = ok(lead.post("/events", {"title": "Raid", "status": "scheduled", "scheduled_on": day.isoformat()}))
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": [helper.user_id]}))
    first = _poll(client)
    assert {(n["kind"], n["discord_user_id"]) for n in first} == {
        ("event_scheduled", lead.discord_id), ("event_scheduled", helper.discord_id)
    }

    # Cancelled, then back on for the same day: people hear again, under new ids.
    ok(lead.patch(f"/events/{event['id']}", {"status": "cancelled", "version": 1}))
    assert {n["kind"] for n in _poll(client)} == {"event_cancelled"}
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": []}))
    ok(lead.patch(f"/events/{event['id']}", {"status": "scheduled", "version": 2}))
    assert [(n["kind"], n["discord_user_id"]) for n in _poll(client)] == [("event_scheduled", lead.discord_id)]
    # The helper, told last round, is added back after the event is on again.
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": [helper.user_id]}))
    again = _poll(client)
    assert [(n["kind"], n["discord_user_id"]) for n in again] == [("event_scheduled", helper.discord_id)]
    assert not {n["id"] for n in again} & {n["id"] for n in first}

    # A late ack of the first round doesn't swallow the second.
    ok(client.post("/lore/staff/notifications/ack", headers=STAFF_KEY, json={"ids": [n["id"] for n in first]}))
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT count(*) AS n FROM lore_notifications WHERE id = ANY(%s) AND acked_at IS NULL",
            ([n["id"] for n in again],),
        ).fetchone()
    assert rows["n"] == len(again)

    # Removed and re-added as helper within the same round: not told twice.
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": []}))
    ok(lead.put(f"/events/{event['id']}/helpers", {"user_ids": [helper.user_id]}))
    assert _poll(client) == []


def test_marking_done_sends_nothing(client):
    lead = Person(client, "lead", lore_helper=True)
    ok(lead.put("/me/settings", {"notify_mode": "all"}))
    event = ok(lead.post("/events", {"title": "Feast", "status": "scheduled", "scheduled_on": TODAY.isoformat()}))
    assert [n["kind"] for n in _poll(client)] == ["event_scheduled"]
    ok(lead.patch(f"/events/{event['id']}", {"status": "done", "outcome": "Fun", "version": 1}))
    assert _poll(client) == []
    ok(lead.delete(f"/events/{event['id']}"))
    assert _poll(client) == []


def test_assigned_mode_and_calendar_notification_redaction(client):
    editor = Person(client, "editor", lore_helper=True)
    assigned = Person(client, "assigned", helper=True)
    calendar_all = Person(client, "calendar-all", helper=True)
    full_available = Person(client, "full-available", lore_helper=True)
    day = TODAY.isoformat()
    for person in (assigned, full_available):
        ok(person.put("/availability/me/days", {"days": [{"day": day, "status": "full"}]}))
    ok(calendar_all.put("/me/settings", {"notify_mode": "all"}))
    storyline = ok(editor.post("/storylines", {"title": "Secret story"}))
    location = ok(editor.post("/locations", {"name": "Old Keep", "x": 1, "z": 2}))
    event = ok(editor.post("/events", {
        "title": "Feast", "status": "scheduled", "scheduled_on": day,
        "storyline_id": storyline["id"], "location_id": location["id"], "notes": "Secret notes",
    }))
    received = {n["discord_user_id"]: n["payload"] for n in _poll(client)}
    assert set(received) == {calendar_all.discord_id, full_available.discord_id}
    assert received[full_available.discord_id]["storyline"] == "Secret story"
    assert received[full_available.discord_id]["location"]["x"] == 1
    assert received[full_available.discord_id]["url"] == f"{SITE}/lore/events/{event['id']}"

    def check_redacted(payload):
        assert payload["storyline"] is None
        assert payload["location"] == {"name": "Old Keep"}
        assert payload["url"] == f"{SITE}/lore/calendar?day={day}"
        assert "notes" not in payload

    check_redacted(received[calendar_all.discord_id])
    ok(editor.put(f"/events/{event['id']}/helpers", {"user_ids": [assigned.user_id]}))
    (notice,) = _poll(client)
    assert notice["discord_user_id"] == assigned.discord_id
    assert notice["payload"]["recipient_is_helper"] is True
    check_redacted(notice["payload"])
    with database.connect() as conn:
        queued = conn.execute("SELECT payload FROM lore_notifications WHERE id = %s", (notice["id"],)).fetchone()
        check_redacted(queued["payload"])
    ok(editor.patch(f"/events/{event['id']}", {"status": "cancelled", "version": 1}))
    cancelled = {n["discord_user_id"]: n["payload"] for n in _poll(client)}
    check_redacted(cancelled[assigned.discord_id])
    check_redacted(cancelled[calendar_all.discord_id])


def test_helpers_sign_themselves_up(client):
    editor = Person(client, "editor", lore_helper=True)
    helper = Person(client, "helper", helper=True)
    player = Person(client, "player")
    day = (TODAY + timedelta(days=2)).isoformat()
    event = ok(editor.post("/events", {"title": "Feast", "status": "scheduled", "scheduled_on": day}))
    _poll(client)
    path = f"/events/{event['id']}/signup"

    # A Helper who never opened the panel is on the roster and can sign up.
    body = ok(helper.put(path))
    assert body["signed_up"] is True and body["helper_ids"] == [helper.user_id]
    assert body["helpers"] == [{"user_id": helper.user_id, "name": "helper"}]
    assert ok(helper.put(path))["helper_ids"] == [helper.user_id]
    (notice,) = _poll(client)
    assert notice["discord_user_id"] == helper.discord_id and notice["payload"]["recipient_is_helper"] is True
    calendar = ok(helper.get(f"/calendar?from={day}&to={day}"))
    assert calendar["events"][0]["helper_ids"] == [helper.user_id]
    assert [h["user_id"] for h in ok(editor.get(f"/events/{event['id']}"))["helpers"]] == [helper.user_id]

    # Lore Helpers can sign up the same way.
    assert ok(editor.put(path))["helper_ids"] == sorted([editor.user_id, helper.user_id])

    body = ok(helper.delete(path))
    assert body["signed_up"] is False and body["helper_ids"] == [editor.user_id]
    assert ok(helper.delete(path))["helper_ids"] == [editor.user_id]
    actions = [h["action"] for h in ok(editor.get(f"/events/{event['id']}/history"))["history"]]
    assert actions[:3] == ["withdrew", "signed_up", "signed_up"]

    assert error(player.put(path), 403) == "no_access"
    assert error(helper.put("/events/999999/signup"), 404) == "not_found"
    idea = ok(editor.post("/events", {"title": "Someday"}))
    assert error(helper.put(f"/events/{idea['id']}/signup"), 409) == "not_open_for_signup"
    done = ok(editor.post("/events", {"title": "Old feast", "status": "done", "scheduled_on": day}))
    assert error(helper.put(f"/events/{done['id']}/signup"), 409) == "not_open_for_signup"
    assert error(helper.delete(f"/events/{done['id']}/signup"), 409) == "event_done"
    ok(editor.delete(f"/events/{event['id']}"))
    assert error(helper.put(path), 409) == "deleted"


def test_pending_notifications_follow_current_access(client):
    editor = Person(client, "editor", role="mod")
    downgraded = Person(client, "downgraded", lore_helper=True, helper=True)
    removed = Person(client, "removed", lore_helper=True)
    switched = Person(client, "switched", lore_helper=True)
    for person in (downgraded, removed, switched):
        ok(person.put("/me/settings", {"notify_mode": "all"}))
    storyline = ok(editor.post("/storylines", {"title": "Secret story"}))
    ok(editor.post("/events", {
        "title": "Feast", "status": "scheduled", "scheduled_on": TODAY.isoformat(), "storyline_id": storyline["id"],
    }))
    ok(switched.put("/me/settings", {"notify_mode": "assigned"}))
    ok(_sync(client, helper=[downgraded.discord_id], lore_helper=[switched.discord_id]))
    (notice,) = _poll(client)
    assert notice["discord_user_id"] == downgraded.discord_id
    assert notice["payload"]["storyline"] is None
    assert notice["payload"]["url"] == f"{SITE}/lore/calendar?day={TODAY}"
