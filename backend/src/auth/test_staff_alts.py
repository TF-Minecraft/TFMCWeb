"""Staff alt links: staff add a second Minecraft account with its own /linkdiscord code."""

from __future__ import annotations

import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api import admin_routes, auth_routes
from src.api.view_as_guard import ViewAsGuard
from src.auth import account_overview, players, testing, users
from src.coreprotect.reader import CoreProtectConfig
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


def test_a_microsoft_link_of_an_alt_reads_as_taken():
    assert auth_routes._LINK_CONFLICTS[STAFF_ALT_TAKEN] == "minecraft_taken"


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
    assert (row["action"], row["actor_name"], row["target_name"], row["detail"]["player_uuid"]) == (
        "account.staff_alt.remove", "ryan", "wren", ALT)
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


def test_admins_cannot_remove_the_alts_of_staff_who_outrank_them(app):
    discord_id, c = wren(app, "root")
    assert add_alt(c).status_code == 200
    _, admin_token = account("ryan", "admin")
    res = client(app, admin_token).post(f"/admin/players/{ALT}/staff-alt/unlink", headers=ORIGIN)
    assert (res.status_code, res.json()["detail"]) == (403, "target_outranks_you")
    row = testing.audit_rows()[-1]
    assert (row["action"], row["outcome"], row["detail"]["error"]) == (
        "account.staff_alt.remove", "denied", "target_outranks_you")
    assert testing.value("SELECT count(*) FROM staff_alt_links") == 1


def test_former_staff_can_still_remove_their_alts(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    testing.set_role(discord_id, "player")
    res = c.post(f"/account/staff-alts/{ALT}/unlink", headers=ORIGIN)
    assert res.status_code == 200 and res.json()["staff_alts"] is None


def test_a_view_of_the_site_cannot_change_staff_alts(app):
    discord_id, c = wren(app)
    assert add_alt(c, OTHER, "Other").status_code == 200
    viewer = testing.value("SELECT id FROM users WHERE discord_user_id = %s", (discord_id,))
    testing.execute("UPDATE user_sessions SET acting_user_id = %s", (viewer,))
    for path, body in (("/account/staff-alts/preview", {"code": code()}), ("/account/staff-alts/link", {"code": code()}),
                       (f"/account/staff-alts/{OTHER}/unlink", None)):
        res = c.post(path, json=body, headers=ORIGIN)
        assert (res.status_code, res.json()["detail"]) == (403, "viewing_as_player")
    assert testing.value("SELECT count(*) FROM staff_alt_links") == 1


def test_uuid_case_does_not_matter(app):
    discord_id, c = wren(app)
    res = c.post("/account/staff-alts/link", json={"code": raw_code(ALT.upper())}, headers=ORIGIN)
    assert res.status_code == 200 and res.json()["staff_alts"]["alts"][0]["player_uuid"] == ALT
    assert discord_link.get_identity_status(ALT.upper())["discord_user_id"] == discord_id
    with pytest.raises(LinkError, match=STAFF_ALT_TAKEN):
        discord_link.complete_link(raw_code(ALT.upper()), "555555555555555555")


def test_expired_and_used_codes_are_refused(app):
    _, c = wren(app)
    plain = code()
    testing.execute("UPDATE discord_link_codes SET expires_at = now() - interval '1 minute'")
    for path in ("/account/staff-alts/preview", "/account/staff-alts/link"):
        res = c.post(path, json={"code": plain}, headers=ORIGIN)
        assert (res.status_code, res.json()["detail"]) == (400, "Link code has expired")
    assert add_alt(c, OTHER, "Other").status_code == 200
    used = testing.value("SELECT count(*) FROM discord_link_codes WHERE used_at IS NOT NULL")
    assert used == 1


def test_an_alt_follows_its_owners_guild_grace(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    discord_link.record_guild_left(discord_id)
    assert discord_link.get_identity_status(ALT)["in_grace"] is True
    testing.execute("UPDATE discord_links SET grace_until = now() - interval '1 minute'")
    assert discord_link.get_identity_status(ALT)["linked"] is False


def test_an_inactive_alt_still_answers_already_linked(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    testing.set_role(discord_id, "player")
    assert discord_link.start_link(ALT, "ShayminPlays")["already_linked"] is True
    with pytest.raises(LinkError, match=STAFF_ALT_TAKEN):
        discord_link.preview_link(raw_code())


def test_staff_player_page_shows_an_alt_never_seen_in_game(app, coreprotect):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    config = CoreProtectConfig.from_env()
    alt = players.profile(config, ALT)
    assert alt["staff_alt_of"]["player_uuid"] == OWNER and alt["staff_alts"] == []
    owner = players.profile(config, OWNER)
    assert owner["staff_alt_of"] is None and [a["minecraft_name"] for a in owner["staff_alts"]] == ["ShayminPlays"]


def _ban(uuid, *, start, hours=None, reason="Abuse", discord_id=None, name="Wren"):
    return enqueue_ban_event("ban", player_uuid=uuid, discord_user_id=discord_id, minecraft_name=name, reason=reason,
                             staff_name="Ryan", banned_at_ms=start, expires_at_ms=start + hours * HOUR if hours else 0)


def test_an_alts_own_ban_is_kept_through_the_owners_ban_and_unban(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(ALT, start=now - HOUR, reason="Own ban", name="ShayminPlays")
    _ban(OWNER, start=now, hours=1)
    own = {b["player_uuid"]: b for b in list_ban_sync()["bans"]}[ALT]
    assert (own["reason"], own["expires_at_ms"]) == ("Own ban", 0)
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=now, expires_at_ms=now + HOUR)
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {ALT}


def test_an_alt_unbanned_by_staff_is_not_banned_again_by_a_repeat_report(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(OWNER, start=now, hours=24)
    enqueue_ban_event("unban", player_uuid=ALT, minecraft_name="ShayminPlays")
    _ban(OWNER, start=now, hours=24)  # another server reports the same ban
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {OWNER}
    # A new ban of the owner is copied again.
    _ban(OWNER, start=now + HOUR, hours=48)
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {OWNER, ALT}


def test_the_owners_unban_lifts_copies_after_the_alt_link_is_gone(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(OWNER, start=now, hours=24)
    assert c.post(f"/account/staff-alts/{ALT}/unlink", headers=ORIGIN).status_code == 200
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=now, expires_at_ms=now + 24 * HOUR)
    assert list_ban_sync()["bans"] == []


def test_an_alts_ban_sends_nothing_to_its_owners_discord(app):
    discord_id, c = wren(app)
    assert add_alt(c).status_code == 200
    result = _ban(ALT, start=int(time.time() * 1000), discord_id=discord_id, name="ShayminPlays")
    assert result["mirrored"] is False and list_undelivered_moderation() == []


def test_an_owner_unbanned_and_banned_again_bans_the_alt_again(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(OWNER, start=now - 60_000, hours=1)
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=now - 60_000,
                      expires_at_ms=now - 60_000 + HOUR)
    # The new ban was made before the unban was reported, as when a server's report is late.
    _ban(OWNER, start=now - 30_000, hours=24)
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {OWNER, ALT}


def test_an_alts_own_shorter_ban_survives_the_owners_ban_and_unban(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(ALT, start=now - HOUR, hours=24, reason="Own ban", name="ShayminPlays")
    _ban(OWNER, start=now, hours=None)
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=now, expires_at_ms=0)
    alt = {b["player_uuid"]: b for b in list_ban_sync()["bans"]}[ALT]
    assert (alt["reason"], alt["expires_at_ms"]) == ("Own ban", now - HOUR + 24 * HOUR)


def test_an_alt_unbanned_before_a_late_owner_report_gets_the_copy(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(ALT, start=now - 2 * HOUR, hours=24, reason="Own ban", name="ShayminPlays")
    enqueue_ban_event("unban", player_uuid=ALT, minecraft_name="ShayminPlays")
    # The owner's ban was made on a server before that unban, but reaches the site after it.
    _ban(OWNER, start=now - HOUR, hours=24)
    assert {b["player_uuid"] for b in list_ban_sync()["bans"]} == {OWNER, ALT}


def test_a_server_echo_inside_the_same_ban_window_keeps_the_copy(app):
    _, c = wren(app)
    assert add_alt(c).status_code == 200
    now = int(time.time() * 1000)
    _ban(OWNER, start=now, hours=24)
    _ban(ALT, start=now + 1000, hours=24, name="ShayminPlays", reason="Staff alt of Wren: Abuse")
    enqueue_ban_event("unban", player_uuid=OWNER, minecraft_name="Wren", banned_at_ms=now, expires_at_ms=now + 24 * HOUR)
    assert list_ban_sync()["bans"] == []
