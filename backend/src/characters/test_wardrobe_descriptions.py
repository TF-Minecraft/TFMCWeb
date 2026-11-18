"""Wardrobe skin descriptions: set, clear, validation, and the text staying with its skin."""
import hashlib
import io

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from src.auth import testing
from src.characters import wardrobe
from src.characters.roster import replace_roster
from src.skins import db as asset_paths

OWNER, LIVE, PENDING = "wardrobe-owner", "live-char", "pending-char"
KEY = "plugin-key"
TEXT = "A hooded figure in a mud-stained travelling cloak."


def png(colour):
    buf = io.BytesIO()
    Image.new("RGBA", (64, 64), colour).save(buf, format="PNG")
    return buf.getvalue()


RED, GREEN, BLUE = [png(colour) for colour in ("red", "green", "blue")]


def signed(data, model):
    return hashlib.sha256(data).hexdigest(), "signature"


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch, postgres):
    for name, sub in (("DATA_DIR", ""), ("SKINS_DIR", "skins"),
                      ("DRINKS_DIR", "drinks"), ("WARDROBE_DIR", "wardrobe")):
        monkeypatch.setattr(asset_paths, name, tmp_path / sub if sub else tmp_path)
    monkeypatch.setattr(wardrobe, "DATA_DIR", tmp_path)
    monkeypatch.setattr(wardrobe, "WARDROBE_DIR", tmp_path / "wardrobe")
    monkeypatch.setattr(wardrobe, "sign_wardrobe_skin", signed)
    monkeypatch.setattr(wardrobe, "swappable_slot_count", lambda *a, **kw: 3)
    monkeypatch.setenv("PLUGIN_KEY", KEY)
    monkeypatch.setenv("PLUGIN_KEYS_SECONDARY", "")
    asset_paths.ensure_directories()
    replace_roster(OWNER, [{"id": LIVE, "name": "Ana", "status": "ALIVE"}])
    testing.execute("INSERT INTO character_creation_requests (id, player_uuid, payload, status, created_at) "
                    "VALUES (%s, %s, '{}', 'pending', now())", (PENDING, OWNER))


def slot(payload, key):
    return next(s for s in payload["slots"] if s["slot"] == key)


def three_skins():
    for key, data in (("base", RED), ("extra_1", GREEN), ("extra_2", BLUE)):
        wardrobe.upload_slot(OWNER, LIVE, key, data)


def test_set_and_clear_a_skin_description():
    three_skins()
    out = wardrobe.set_slot_description(OWNER, LIVE, "extra_1", f"  {TEXT}  ")
    assert out["descriptions"] is True
    assert slot(out, "extra_1")["description"] == TEXT
    assert slot(out, "extra_2")["description"] is None
    plugin = wardrobe.get_wardrobe_for_plugin(OWNER, LIVE)
    assert plugin["descriptions"] is True
    assert slot(plugin, "extra_1")["description"] == TEXT
    assert slot(wardrobe.set_slot_description(OWNER, LIVE, "extra_1", "   "), "extra_1")["description"] is None
    wardrobe.set_slot_description(OWNER, LIVE, "extra_1", TEXT)
    assert slot(wardrobe.set_slot_description(OWNER, LIVE, "extra_1", None), "extra_1")["description"] is None


def test_base_empty_locked_and_pending_skins_refuse_a_description(monkeypatch):
    three_skins()
    with pytest.raises(wardrobe.WardrobeError, match="Base uses your character description"):
        wardrobe.set_slot_description(OWNER, LIVE, "base", TEXT)
    with pytest.raises(wardrobe.WardrobeError, match="empty") as empty:
        wardrobe.set_slot_description(OWNER, LIVE, "masked", TEXT)
    assert empty.value.status_code == 404
    monkeypatch.setattr(wardrobe, "swappable_slot_count", lambda *a, **kw: 1)
    with pytest.raises(wardrobe.WardrobeError) as locked:
        wardrobe.set_slot_description(OWNER, LIVE, "extra_1", TEXT)
    assert locked.value.status_code == 403
    wardrobe.upload_slot(OWNER, PENDING, "base", RED)
    with pytest.raises(wardrobe.WardrobeError) as pending:
        wardrobe.set_slot_description(OWNER, PENDING, "masked", TEXT)
    assert pending.value.status_code == 409
    assert "descriptions" not in wardrobe.get_wardrobe(OWNER, PENDING)


def test_site_text_follows_the_catalogue_limits_and_refuses_colour_codes(monkeypatch):
    three_skins()
    monkeypatch.setattr(wardrobe, "get_catalog",
                        lambda: {"validation": {"description": {"min_length": 10, "max_length": 20}}})
    with pytest.raises(wardrobe.WardrobeError, match="at least 10"):
        wardrobe.set_slot_description(OWNER, LIVE, "extra_1", "Too short")
    with pytest.raises(wardrobe.WardrobeError, match="at most 20"):
        wardrobe.set_slot_description(OWNER, LIVE, "extra_1", "This one is far too long")
    with pytest.raises(wardrobe.WardrobeError, match="colour codes"):
        wardrobe.set_slot_description(OWNER, LIVE, "extra_1", "&cA red cloak")
    for brk in ("\u2028", "\u2029", "\x85"):
        with pytest.raises(wardrobe.WardrobeError, match="line breaks"):
            wardrobe.set_slot_description(OWNER, LIVE, "extra_1", f"A red{brk}cloak")
        with pytest.raises(wardrobe.WardrobeError, match="line breaks"):
            wardrobe.set_slot_description_for_plugin(OWNER, LIVE, "extra_1", f"A red{brk}cloak")
        with pytest.raises(wardrobe.WardrobeError, match="line breaks"):
            wardrobe.set_slot_description_for_plugin(OWNER, LIVE, "extra_1", f"A red cloak{brk}")
        with pytest.raises(wardrobe.WardrobeError, match="line breaks"):
            wardrobe.set_slot_description(OWNER, LIVE, "extra_1", f"{brk}A red cloak that is long enough to pass")
    monkeypatch.setattr(wardrobe, "get_catalog", lambda: {})
    with pytest.raises(wardrobe.WardrobeError, match="at least 32"):
        wardrobe.set_slot_description(OWNER, LIVE, "extra_1", "A short cloak line")


def test_description_stays_with_its_skin_through_replace_and_pack():
    three_skins()
    wardrobe.upload_slot(OWNER, LIVE, "masked", BLUE)
    wardrobe.set_slot_description(OWNER, LIVE, "extra_2", TEXT)
    wardrobe.set_slot_description(OWNER, LIVE, "masked", "A figure in a black hood, face hidden in shadow.")
    # A new picture or arm model keeps the text, like the name.
    wardrobe.upload_slot(OWNER, LIVE, "extra_2", RED)
    assert slot(wardrobe.get_wardrobe(OWNER, LIVE), "extra_2")["description"] == TEXT
    # Clearing Skin 2 packs Skin 3 into its place; the description moves with it.
    out = wardrobe.clear_slot(OWNER, LIVE, "extra_1")
    assert slot(out, "extra_1")["description"] == TEXT
    assert not slot(out, "extra_2")["filled"]
    assert slot(out, "extra_2")["description"] is None
    assert testing.rows("SELECT slot FROM character_wardrobe_slots WHERE description IS NOT NULL ORDER BY slot") == [
        {"slot": "extra_1"}, {"slot": "masked"}]
    # Moving onto Base hides the text there but keeps it stored.
    out = wardrobe.clear_slot(OWNER, LIVE, "base")
    assert slot(out, "base")["description"] is None
    assert testing.rows("SELECT description FROM character_wardrobe_slots WHERE slot = 'base'") == [
        {"description": TEXT}]


def test_plugin_route_sets_text_with_colour_codes():
    from src.api.characters_routes import characters_router

    three_skins()
    app = FastAPI()
    app.include_router(characters_router)
    client = TestClient(app)
    url = f"/characters/plugin/wardrobe/{OWNER}/{LIVE}/slots/extra_1/description"
    assert client.post(url, json={"description": TEXT}).status_code in (401, 403)
    res = client.post(url, json={"description": "&6A gilded cloak"}, headers={"X-Plugin-Key": KEY})
    assert res.status_code == 200, res.text
    body = res.json()
    assert slot(body, "extra_1")["description"] == "&6A gilded cloak"
    assert slot(body, "extra_1")["texture_value"]
    # Kept as typed in game, symbols included; only line breaks and controls are refused.
    res = client.post(url, json={"description": "Scarred, but smiles a lot <3"}, headers={"X-Plugin-Key": KEY})
    assert slot(res.json(), "extra_1")["description"] == "Scarred, but smiles a lot <3"
    assert client.post(url, json={"description": "One\nTwo"}, headers={"X-Plugin-Key": KEY}).status_code == 400
    res = client.post(url, json={"description": None}, headers={"X-Plugin-Key": KEY})
    assert slot(res.json(), "extra_1")["description"] is None
    base = f"/characters/plugin/wardrobe/{OWNER}/{LIVE}/slots/base/description"
    assert client.post(base, json={"description": TEXT}, headers={"X-Plugin-Key": KEY}).status_code == 400
