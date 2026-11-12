"""Staff alt links: staff add a second Minecraft account with its own /linkdiscord code."""

from __future__ import annotations

import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api import admin_routes, auth_routes
from src.api.view_as_guard import ViewAsGuard
from src.auth import account_overview, testing, users
from src.skins import codes, discord_link, staff_alts, submissions
from src.skins.discord_link import STAFF_ALT_TAKEN, LinkError
from src.skins.moderation import enqueue_ban_event, list_ban_sync, list_undelivered_moderation
from src.skins.plugin_notices import list_undelivered_plugin_notices
from src.skins.testing import link

SITE = "https://www.tfminecraft.net"
ORIGIN = {"Origin": SITE}
SESSION = "__Host-tfmc_session"
DOMAIN = "testserver.local"
OWNER = "00000000-0000-4000-8000-0000000000a1"
ALT = "00000000-0000-4000-8000-0000000000a2"
OTHER = "00000000-0000-4000-8000-0000000000a3"
HOUR = 3_600_000


@pytest.fixture
def env(database, postgres, monkeypatch):
    monkeypatch.setenv("DISCORD_AUTH_ENABLED", "1")
    monkeypatch.setenv("DISCORD_CLIENT_ID", "client-id")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("DISCORD_GUILD_ID", "999999999999999999")
    monkeypatch.setenv("SITE_PUBLIC_URL", SITE)
    monkeypatch.setenv("PATREON_ENABLED", "0")
    monkeypatch.delenv("DISCORD_REDIRECT_URI", raising=False)
    monkeypatch.delenv("PS_PRODUCTION", raising=False)
    auth_routes._LINK_RATE_BUCKETS.clear()
    return database


@pytest.fixture
def app(env):
    app = FastAPI()
    app.include_router(auth_routes.auth_router)
    admin_routes.install(app)
    app.add_middleware(ViewAsGuard)
    return app


def account(name, role="player", player_uuid=None):
    """A signed-in account, linked to player_uuid when given; (discord id, client)."""
    discord_id = str(100000000000000000 + sum(map(ord, name)) * 7919)
    token = users.sign_in(
        {"discord_user_id": discord_id, "discord_username": name, "discord_global_name": name.title(),
         "discord_avatar": None},
        guild_member=True,
    )
    testing.set_role(discord_id, role)
    if player_uuid:
        link(player_uuid, discord_id, name.title(), name, linked_at="2026-10-01T00:00:00Z")
    return discord_id, token


def client(app, token):
    c = TestClient(app, base_url="https://testserver")
    c.cookies.set(SESSION, token, domain=DOMAIN)
    return c


def code(player_uuid=ALT, name="ShayminPlays"):
    return discord_link.start_link(player_uuid, name)["code"]


def raw_code(player_uuid=ALT, name="ShayminPlays"):
    """A /linkdiscord code even for an account that start_link would call linked."""
    plain = codes.generate_plaintext_code()
    testing.execute(
        "INSERT INTO discord_link_codes (code_hash, player_uuid, minecraft_name, created_at, expires_at) "
        "VALUES (%s, %s, %s, now(), now() + interval '15 minutes')",
        (codes.hash_secret(plain), player_uuid, name),
    )
    return plain


def wren(app, role="mod"):
    discord_id, token = account("wren", role, OWNER)
    return discord_id, client(app, token)


def add_alt(c, player_uuid=ALT, name="ShayminPlays"):
    return c.post("/account/staff-alts/link", json={"code": code(player_uuid, name)}, headers=ORIGIN)


def test_staff_link_an_alt_with_its_code(app):
    discord_id, c = wren(app)
    plain = code()
    preview = c.post("/account/staff-alts/preview", json={"code": plain}, headers=ORIGIN)
    assert preview.status_code == 200, preview.text
    assert preview.json()["minecraft_name"] == "ShayminPlays" and preview.json()["player_uuid"] == ALT

    res = c.post("/account/staff-alts/link", json={"code": plain}, headers=ORIGIN)
    assert res.status_code == 200, res.text
    view = res.json()["staff_alts"]
    assert [a["minecraft_name"] for a in view["alts"]] == ["ShayminPlays"]
    assert view["active"] is True and view["max"] == staff_alts.MAX_ALTS
    assert c.get("/account").json()["staff_alts"] == view
    # The code is spent, the alt hears it is linked, and the link is on record.
    assert c.post("/account/staff-alts/link", json={"code": plain}, headers=ORIGIN).status_code == 400
    assert any(n["type"] == "link_success" and n["player_uuid"] == ALT for n in list_undelivered_plugin_notices())
    audit = testing.audit_rows()[-1]
    assert (audit["action"], audit["detail"]["player_uuid"]) == ("account.staff_alt.link", ALT)

    # The alt now counts as linked through its owner: the gate, codes and skin uploads.
    status = discord_link.get_identity_status(ALT)
    assert status["linked"] and status["eligible"] and status["discord_user_id"] == discord_id
    assert status["player_uuid"] == ALT and status["minecraft_name"] == "ShayminPlays"
    assert status["staff_alt_of"] == {"player_uuid": OWNER, "minecraft_name": "Wren"}
    assert codes.issue_code(ALT, "profile")["scope"] == "profile"
    assert submissions._link_names(ALT) == {
        "minecraft_name": "ShayminPlays", "discord_username": "wren", "discord_user_id": discord_id}
    assert discord_link.start_link(ALT, "ShayminPlays") == {"already_linked": True, "discord_username": "wren"}
    # The owner's own link is unchanged.
    assert discord_link.get_identity_status(OWNER)["player_uuid"] == OWNER


def test_players_cannot_link_alts(app):
    _, token = account("steve", "player", OWNER)
    c = client(app, token)
    assert c.post("/account/staff-alts/preview", json={"code": code()}, headers=ORIGIN).status_code == 403
    assert c.post("/account/staff-alts/link", json={"code": code()}, headers=ORIGIN).status_code == 403
    assert c.get("/account").json()["staff_alts"] is None
    assert testing.value("SELECT count(*) FROM staff_alt_links") == 0


def test_cross_origin_writes_are_refused(app):
    _, c = wren(app)
    assert c.post("/account/staff-alts/link", json={"code": code()}).status_code == 403
    assert testing.value("SELECT count(*) FROM staff_alt_links") == 0


@pytest.mark.parametrize("case,message", [
    ("own", "That is your own linked Minecraft account"),
    ("discord_linked", "This Minecraft account is already linked to a Discord account"),
    ("mine", "This Minecraft account is already one of your staff alts"),
    ("theirs", STAFF_ALT_TAKEN),
    ("banned", "Your linked Minecraft account is banned"),
])
def test_refused_alts(app, case, message):
    _, c = wren(app)
    target = ALT
    if case == "own":
        target = OWNER
    elif case == "discord_linked":
        account("someone", "player", ALT)
    elif case == "mine":
        assert add_alt(c).status_code == 200
    elif case == "theirs":
        _, token = account("ryan", "admin", OTHER)
        assert add_alt(client(app, token)).status_code == 200
    elif case == "banned":
        enqueue_ban_event("ban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=1, expires_at_ms=0)
    plain = raw_code(target)
    for path in ("/account/staff-alts/preview", "/account/staff-alts/link"):
        res = c.post(path, json={"code": plain}, headers=ORIGIN)
        assert (res.status_code, res.json()["detail"]) == (400, message)
    # A refused link rolls back its spend of the code.
    assert testing.value("SELECT used_at FROM discord_link_codes WHERE player_uuid = %s ORDER BY id DESC LIMIT 1",
                         (target,)) is None


def test_staff_without_their_own_link_cannot_add_alts(app):
    _, token = account("wren", "mod")
    res = client(app, token).post("/account/staff-alts/link", json={"code": code()}, headers=ORIGIN)
    assert (res.status_code, res.json()["detail"]) == (400, "Link your own Minecraft account before adding a staff alt")


def test_alts_are_capped(app):
    _, c = wren(app)
    for n in range(staff_alts.MAX_ALTS):
        assert add_alt(c, f"00000000-0000-4000-8000-0000000001{n:02d}", f"Alt{n}").status_code == 200
    res = add_alt(c)
    assert (res.status_code, res.json()["detail"]) == (400, f"You can link up to {staff_alts.MAX_ALTS} staff alts")


def test_an_alt_is_never_linked_as_an_own_account(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    with pytest.raises(LinkError, match=STAFF_ALT_TAKEN):
        discord_link.preview_link(raw_code())
    with pytest.raises(LinkError, match=STAFF_ALT_TAKEN):
        discord_link.complete_link(raw_code(), "555555555555555555")
    with pytest.raises(LinkError, match=STAFF_ALT_TAKEN):
        discord_link.link_verified_profile(ALT, "ShayminPlays", "555555555555555555")
    assert testing.value("SELECT count(*) FROM discord_links WHERE player_uuid = %s", (ALT,)) == 0


def test_an_alt_counts_only_while_its_owner_is_linked_staff(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200

    testing.set_role(discord_id, "player")
    assert discord_link.get_identity_status(ALT)["linked"] is False
    assert discord_link.get_link_for_uuid(ALT) is None
    with pytest.raises(codes.CodeError):
        codes.issue_code(ALT, "profile")
    # The link stays, shown as inactive, so they can still remove it; it works again if they return.
    view = c.get("/account").json()["staff_alts"]
    assert view["active"] is False and len(view["alts"]) == 1
    testing.set_role(discord_id, "admin")
    assert discord_link.get_identity_status(ALT)["eligible"] is True

    discord_link.unlink_by_discord_id(discord_id)
    assert discord_link.get_identity_status(ALT)["linked"] is False


def test_owner_removes_an_alt_and_others_cannot(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    _, token = account("ryan", "mod", OTHER)
    other = client(app, token)
    assert other.post(f"/account/staff-alts/{ALT}/unlink", headers=ORIGIN).status_code == 404

    res = c.post(f"/account/staff-alts/{ALT}/unlink", headers=ORIGIN)
    assert res.status_code == 200 and res.json()["staff_alts"]["alts"] == []
    assert testing.audit_rows()[-1]["action"] == "account.staff_alt.unlink"
    assert discord_link.get_identity_status(ALT)["linked"] is False
    # Removed, the account can link to Discord normally again.
    assert discord_link.complete_link(code(), "555555555555555555")["player_uuid"] == ALT


def test_admins_remove_anyones_alt(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    _, mod_token = account("moddy", "mod")
    assert client(app, mod_token).post(f"/admin/players/{ALT}/staff-alt/unlink", headers=ORIGIN).status_code == 403
    _, admin_token = account("ryan", "admin")
    admin = client(app, admin_token)
    res = admin.post(f"/admin/players/{ALT}/staff-alt/unlink", headers=ORIGIN)
    assert res.status_code == 200 and res.json() == {"staff_alt_of": None, "staff_alts": []}
    row = testing.audit_rows()[-1]
    assert (row["action"], row["actor_name"], row["detail"]["player_uuid"]) == ("admin.staff_alt.unlink", "ryan", ALT)
    assert admin.post(f"/admin/players/{ALT}/staff-alt/unlink", headers=ORIGIN).status_code == 404


def test_staff_tools_show_both_sides(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    alt = staff_alts.for_player(ALT)
    assert alt["staff_alt_of"]["player_uuid"] == OWNER and alt["staff_alt_of"]["discord_user_id"] == discord_id
    owner = staff_alts.for_player(OWNER.upper())
    assert owner["staff_alt_of"] is None and [a["player_uuid"] for a in owner["staff_alts"]] == [ALT]


def test_head_serves_only_your_own_alts(app, monkeypatch):
    asked = []
    monkeypatch.setattr(account_overview, "head", lambda uuid: asked.append(uuid) or b"png")
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    assert c.get("/account/minecraft/head", params={"u": ALT}).status_code == 200
    assert c.get("/account/minecraft/head", params={"u": OTHER}).status_code == 200
    assert asked == [ALT, OWNER]


def test_owner_bans_reach_the_alts(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)

    enqueue_ban_event("ban", player_uuid=OWNER, discord_user_id=discord_id, minecraft_name="Wren",
                      reason="Abuse", staff_name="Ryan", banned_at_ms=now, expires_at_ms=now + 24 * HOUR)
    bans = {b["player_uuid"]: b for b in list_ban_sync()["bans"]}
    assert bans[ALT]["reason"] == "Staff alt of Wren: Abuse" and bans[ALT]["staff_name"] == "Ryan"
    assert (bans[ALT]["banned_at_ms"], bans[ALT]["expires_at_ms"]) == (now, now + 24 * HOUR)
    assert bans[ALT]["minecraft_name"] == "ShayminPlays"
    # Only the owner's ban is sent to Discord.
    assert [(n["type"], n["player_uuid"]) for n in list_undelivered_moderation()] == [("ban", OWNER)]
    # A server reporting the alt's ban back changes nothing.
    assert enqueue_ban_event("ban", player_uuid=ALT, discord_user_id=discord_id, minecraft_name="ShayminPlays",
                             banned_at_ms=now, expires_at_ms=now + 24 * HOUR)["duplicate"] is True

    enqueue_ban_event("unban", player_uuid=OWNER, discord_user_id=discord_id, minecraft_name="Wren",
                      banned_at_ms=now, expires_at_ms=now + 24 * HOUR)
    sync = list_ban_sync()
    assert sync["bans"] == [] and {u["player_uuid"] for u in sync["unbans"]} == {OWNER, ALT}


def test_alt_ban_gets_times_from_a_later_report(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    # A server that sends no times first: nothing can sync yet.
    enqueue_ban_event("ban", player_uuid=OWNER, minecraft_name="Wren", reason="Abuse")
    assert list_ban_sync()["bans"] == []
    enqueue_ban_event("ban", player_uuid=OWNER, minecraft_name="Wren", reason="Abuse",
                      banned_at_ms=now, expires_at_ms=0)
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {OWNER, ALT}


def test_unbanning_an_owner_leaves_unbanned_alts_alone(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren")
    assert testing.value("SELECT count(*) FROM player_bans WHERE player_uuid = %s", (ALT,)) == 0
