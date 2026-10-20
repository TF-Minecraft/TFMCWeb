"""3D bows and crossbows, animated (.mcmeta) textures, shared base sets, single armour sets."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest
from PIL import Image

from src.skins import storage
from src.skins.animation import AnimationError, first_frame, frame_count, parse_mcmeta
from src.skins.base_sets import base_sets_by_kind, load_base_sets
from src.skins.size_limits import SizeLimitError, assert_3d_pair_budgets
from src.skins.storage import StorageError, write_submission_files

MODEL = {
    "elements": [
        {
            "from": [7, 0, 7],
            "to": [9, 16, 9],
            "faces": {"north": {"uv": [0, 0, 2, 16], "texture": "#0"}},
        }
    ],
    "textures": {"0": "my_bow"},
}


def _png(size: tuple[int, int], colours: list[tuple[int, int, int, int]] | None = None) -> bytes:
    """A PNG of 16-tall frames stacked downwards, each frame its own colour."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    for i, colour in enumerate(colours or []):
        img.paste(colour, (0, i * size[0], size[0], (i + 1) * size[0]))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _model(**extra) -> bytes:
    return json.dumps({**MODEL, **extra}).encode()


def _meta(**animation) -> bytes:
    return json.dumps({"animation": animation}).encode()


@pytest.fixture()
def skins_dir(tmp_path, monkeypatch) -> Path:
    monkeypatch.setattr(storage, "SKINS_DIR", tmp_path)
    return tmp_path


def _write(kind: str, files: dict[str, bytes], **kwargs) -> Path:
    return write_submission_files("sub1", "p_bow", kind, "Bow", files, **kwargs)


# --- base sets ----------------------------------------------------------------


def test_base_sets_come_from_shared_json():
    sets = base_sets_by_kind()
    for wanted in ("wands", "mage blades", "pickaxes", "shovels", "fishing rods", "instruments"):
        assert wanted in sets["handheld"]
        assert wanted in sets["item_3d"]
    for wanted in ("longswords", "greataxes"):
        assert wanted in sets["large_handheld"]
        assert wanted in sets["item_3d"]
    assert "battle standards" in sets["item_3d"]
    assert "battle standards" not in sets["handheld"]
    assert sets["bow_3d"] == {"shortbows", "longbows"}
    assert sets["crossbow_3d"] == {"crossbows"}
    assert "armor_set" not in sets


def test_every_base_set_kind_is_an_upload_kind():
    from src.skins.submissions import ALLOWED_KINDS, BASE_SETS

    data = load_base_sets()
    groups = {g["id"] for g in data["groups"]}
    for row in data["base_sets"]:
        assert row["group"] in groups
        assert set(row["kinds"]) <= ALLOWED_KINDS
    assert BASE_SETS == base_sets_by_kind()


def test_spaced_base_set_is_kept_verbatim():
    from src.skins.submissions import _validate_base_set

    assert _validate_base_set("handheld", "mage blades") == "mage blades"
    assert _validate_base_set("bow_3d", "longbows") == "longbows"


# --- single armour sets -------------------------------------------------------


def test_single_armour_sets():
    from src.skins.naming import armor_tier_base_set, armor_tier_label
    from src.skins.submissions import SubmissionError, _validate_tiers

    assert _validate_tiers(["wild_mage"]) == ["wild_mage"]
    assert armor_tier_base_set("wild_mage") == "wild mage"
    assert armor_tier_base_set("leather") == "leather"
    assert armor_tier_label("light_mage") == "Light Mage"
    assert armor_tier_label("bloodmagic") == "Bloodmagic"
    with pytest.raises(SubmissionError, match="set of its own"):
        _validate_tiers(["leather", "light_iron"])
    with pytest.raises(SubmissionError, match="set of its own"):
        _validate_tiers(["illusion", "arcanum"])


# --- size budget --------------------------------------------------------------


def test_ranged_3d_budget_counts_every_file_for_every_rank():
    files = {"texture": b"t" * 20000, "model": b"m" * 20000, "pull_0_model": b"m" * 20000}
    # Far above the per-rank pair cap, still inside the fixed 60 KiB.
    assert_3d_pair_budgets("bow_3d", files, 0)
    files["texture_mcmeta"] = b"x" * 2000
    with pytest.raises(SizeLimitError, match=r"bow_3d: texture \+ models is 62000 bytes \(limit 61440 bytes\)"):
        assert_3d_pair_budgets("bow_3d", files, 10**9)


def test_texture_mcmeta_counts_toward_item_3d_pair():
    with pytest.raises(SizeLimitError):
        assert_3d_pair_budgets(
            "item_3d",
            {"texture": b"t" * 100, "model": b"m" * 100, "texture_mcmeta": b"x" * 100},
            250,
        )


# --- 3D bows ------------------------------------------------------------------


def test_bow_3d_writes_texture_and_four_models(skins_dir):
    files = {"texture": _png((16, 16))}
    for field in ("model", "pull_0_model", "pull_1_model", "pull_2_model"):
        files[field] = _model()
    out = _write("bow_3d", files, base_set="longbows")
    names = sorted(p.name for p in out.iterdir())
    assert names == ["meta.json", "p_bow.json", "p_bow.png", "p_bow_0.json", "p_bow_1.json", "p_bow_2.json"]
    model = json.loads((out / "p_bow_2.json").read_text())
    assert model["textures"]["0"].endswith(":item/p_bow")
    # Vanilla bow hand pose fills a missing display tab.
    assert model["display"]["thirdperson_righthand"]["rotation"] == [-80, 260, -40]
    assert "head" not in model["display"]


def test_crossbow_3d_needs_charged_model(skins_dir):
    files = {"texture": _png((16, 16))}
    for field in ("model", "pull_0_model", "pull_1_model", "pull_2_model"):
        files[field] = _model()
    with pytest.raises(StorageError, match="charged_model"):
        _write("crossbow_3d", files)
    files["charged_model"] = _model()
    out = _write("crossbow_3d", files)
    assert (out / "p_bow_charged.json").is_file()
    charged = json.loads((out / "p_bow_charged.json").read_text())
    assert charged["display"]["thirdperson_righthand"]["rotation"] == [-90, 0, -60]


def test_bow_3d_reports_which_model_is_bad(skins_dir):
    files = {"texture": _png((16, 16)), "model": _model(), "pull_0_model": _model(),
             "pull_1_model": b'{"elements": []}', "pull_2_model": _model()}
    with pytest.raises(StorageError, match="pull_1_model"):
        _write("bow_3d", files)


# --- animation ----------------------------------------------------------------


RED, GREEN, BLUE = (255, 0, 0, 255), (0, 255, 0, 255), (0, 0, 255, 255)


def test_animated_handheld_is_a_strip_of_16px_frames(skins_dir):
    meta = json.dumps({"animation": {"frametime": 4, "frames": [1, {"index": 0, "time": 8}]}}, indent=4).encode()
    out = _write("handheld", {"texture": _png((16, 48), [RED, GREEN, BLUE]), "texture_mcmeta": meta})
    stored = out / "p_bow.png.mcmeta"
    assert json.loads(stored.read_text()) == {
        "animation": {"frametime": 4, "frames": [1, {"index": 0, "time": 8}]}
    }
    assert b"\n" not in stored.read_bytes()
    png = out / "p_bow.png"
    assert frame_count(png) == 3
    with Image.open(png) as im:
        frame = first_frame(png, im.convert("RGBA"))
    assert frame.size == (16, 16)
    assert frame.getpixel((0, 0)) == GREEN


def test_still_texture_keeps_its_exact_size(skins_dir):
    with pytest.raises(StorageError, match="16x16"):
        _write("handheld", {"texture": _png((16, 48))})


def test_animated_frames_must_match_the_kind_size(skins_dir):
    with pytest.raises(StorageError, match="frames must be 16x16, got 32x32"):
        _write("handheld", {"texture": _png((32, 64)), "texture_mcmeta": _meta()})


def test_flat_crossbow_charged_animation_follows_its_arrow_copy(skins_dir):
    files = {
        "texture": _png((16, 16), [RED]),
        "pull_0": _png((16, 16), [GREEN]),
        "pull_1": _png((16, 16), [BLUE]),
        "pull_2": _png((16, 16), [(1, 2, 3, 255)]),
        "charged": _png((16, 32), [RED, BLUE]),
        "charged_mcmeta": _meta(frametime=2),
    }
    out = _write("crossbow", files)
    assert (out / "p_bow_charged.png.mcmeta").is_file()
    assert (out / "p_bow_arrow.png.mcmeta").is_file()
    assert not (out / "p_bow.png.mcmeta").exists()


def test_armour_layers_cannot_be_animated(skins_dir):
    with pytest.raises(StorageError, match="armour layer textures cannot be animated"):
        _write(
            "armor_set",
            {"light_iron_layer_1": _png((64, 32)), "light_iron_layer_1_mcmeta": _meta()},
            tiers=["light_iron"],
        )


def test_mcmeta_needs_its_png(skins_dir):
    with pytest.raises(StorageError, match="no PNG 'model'"):
        _write("item_3d", {"texture": _png((16, 16)), "model": _model(), "model_mcmeta": _meta()})


def test_failed_upload_leaves_no_files(skins_dir):
    with pytest.raises(StorageError):
        _write("handheld", {"texture": _png((16, 32)), "texture_mcmeta": b"{"})
    assert not (skins_dir / "sub1").exists()


@pytest.mark.parametrize(
    ("meta", "image", "message"),
    [
        (b"[]", (16, 32), 'only an "animation" section'),
        (b'{"animation": {}, "villager": {}}', (16, 32), 'only an "animation" section'),
        (_meta(frametime=0), (16, 32), "frametime"),
        (_meta(frametime=True), (16, 32), "frametime"),
        (_meta(interpolate="yes"), (16, 32), "interpolate"),
        (_meta(blur=True), (16, 32), "unsupported keys: blur"),
        (_meta(frames=[]), (16, 32), "non-empty list"),
        (_meta(frames=[2]), (16, 32), "frame 2 does not exist"),
        (_meta(frames=[{"time": 2}]), (16, 32), "need an index"),
        (_meta(frames=[{"index": 0, "time": 0}]), (16, 32), "time must be"),
        (_meta(width=10), (16, 32), "whole grid"),
        (b"\xff", (16, 32), "not valid JSON"),
        (b" " * 3000, (16, 32), "limit 2048 bytes"),
    ],
)
def test_bad_mcmeta(meta, image, message):
    with pytest.raises(AnimationError, match=message):
        parse_mcmeta(meta, image)


def test_mcmeta_frame_size_rules():
    # Square frames of the shorter side by default; width/height override.
    assert parse_mcmeta(_meta(), (16, 64))[1] == 4
    assert parse_mcmeta(_meta(width=8), (16, 64))[1] == 2
    assert parse_mcmeta(_meta(height=8), (16, 64))[1] == 8
    assert parse_mcmeta(_meta(width=8, height=16), (16, 64))[1] == 8
    assert parse_mcmeta(_meta(width=16, height=16, frames=[3]), (32, 32))[1] == 4


def test_first_frame_of_a_grid(tmp_path):
    img = Image.new("RGBA", (32, 32))
    img.paste(RED, (0, 0, 16, 16))
    img.paste(GREEN, (16, 0, 32, 16))
    img.paste(BLUE, (0, 16, 16, 32))
    png = tmp_path / "grid.png"
    img.save(png)
    (tmp_path / "grid.png.mcmeta").write_bytes(_meta(width=16, height=16, frames=[2, 0]))
    assert frame_count(png) == 4
    assert first_frame(png, img).getpixel((0, 0)) == BLUE


def test_plugin_file_list_includes_mcmeta(skins_dir, monkeypatch):
    from src.skins import submissions

    monkeypatch.setattr(submissions, "SKINS_DIR", skins_dir)
    _write("handheld", {"texture": _png((16, 32), [RED, GREEN]), "texture_mcmeta": _meta()})
    assert submissions._list_asset_files("sub1") == ["p_bow.png", "p_bow.png.mcmeta"]


# --- static renders -----------------------------------------------------------


def test_bow_3d_preview_job_shows_standby_and_drawn(tmp_path):
    from src.skins.preview_3d import _job_for_kind

    (tmp_path / "b.png").write_bytes(_png((16, 16)))
    for suffix in ("", "_0", "_1", "_2", "_charged"):
        (tmp_path / f"b{suffix}.json").write_text("{}")
    assert _job_for_kind("bow_3d", "b", tmp_path, [])["views"] == ["model", "pull_2"]
    job = _job_for_kind("crossbow_3d", "b", tmp_path, [])
    assert job["views"] == ["model", "pull_2", "charged"]
    assert job["files"]["charged"].endswith("b_charged.json")


def test_renderer_gets_first_frame_crops(tmp_path):
    from src.skins.preview_3d import _first_frame_files

    png = tmp_path / "b.png"
    png.write_bytes(_png((16, 32), [RED, GREEN]))
    (tmp_path / "b.png.mcmeta").write_bytes(_meta(frames=[1]))
    still = tmp_path / "still.png"
    still.write_bytes(_png((16, 16)))
    crops = tmp_path / "crops"
    crops.mkdir()
    out = _first_frame_files({"texture": str(png), "other": str(still), "model": "x.json"}, crops)
    assert out["other"] == str(still) and out["model"] == "x.json"
    with Image.open(out["texture"]) as im:
        assert im.size == (16, 16)
        assert im.convert("RGBA").getpixel((0, 0)) == GREEN


def test_thumbnail_uses_first_frame(skins_dir, monkeypatch):
    from src.skins import thumbnail

    monkeypatch.setattr(thumbnail, "SKINS_DIR", skins_dir)
    _write("handheld", {"texture": _png((16, 32), [RED, GREEN]), "texture_mcmeta": _meta()})
    data = thumbnail.skin_thumbnail("sub1", "p_bow")
    with Image.open(io.BytesIO(data)) as im:
        assert im.size == (16, 16)


# --- through the real upload and plugin API -----------------------------------

from src.skins.test_batch_and_wire import PLUGIN, api  # noqa: E402,F401 - shared fixture
from src.skins.test_locking import ENTITLEMENTS, env, session_for  # noqa: E402,F401


def _real_files(monkeypatch, kinds):
    """The shared env fixture skips writing files; these tests need them on disk."""
    from src.skins import db, submissions

    # One folder for writing, listing and the download route's path check.
    monkeypatch.setattr(storage, "SKINS_DIR", db.SKINS_DIR)
    monkeypatch.setattr(submissions, "SKINS_DIR", db.SKINS_DIR)
    monkeypatch.setattr(submissions, "write_submission_files", write_submission_files)
    monkeypatch.setattr(submissions, "resolve_web_entitlements", lambda *a, **k: {
        **ENTITLEMENTS, "skin_kinds": kinds, "max_3d_pair_bytes": 0})


def test_plugin_downloads_3d_crossbow_with_animation(api, monkeypatch):
    from src.skins import submissions

    _real_files(monkeypatch, ["crossbow_3d"])
    files = {"texture": _png((16, 32), [RED, GREEN]), "texture_mcmeta": _meta(frametime=3)}
    for field in ("model", "pull_0_model", "pull_1_model", "pull_2_model", "charged_model"):
        files[field] = _model()
    made = submissions.create_submission(
        session_for("skin"), "crossbow_3d", "Arm Crossbow", files, base_set="crossbows")
    submissions.approve_submission(made["id"])
    row = api.get("/skins/plugin/approved", headers=PLUGIN).json()["submissions"][0]
    slug = made["slug"]
    assert row["kind"] == "crossbow_3d" and row["base_set"] == "crossbows"
    for name in (f"{slug}.png", f"{slug}.png.mcmeta", f"{slug}.json", f"{slug}_2.json", f"{slug}_charged.json"):
        assert name in row["files"]
    response = api.get(f"/skins/plugin/submissions/{made['id']}/files/{slug}.png.mcmeta", headers=PLUGIN)
    assert response.status_code == 200
    assert response.json() == {"animation": {"frametime": 3}}


def test_crossbow_3d_missing_models_are_named(api, monkeypatch):
    from src.skins import submissions

    monkeypatch.setattr(submissions, "resolve_web_entitlements", lambda *a, **k: {
        **ENTITLEMENTS, "skin_kinds": ["crossbow_3d"]})
    with pytest.raises(submissions.SubmissionError, match="Missing files: pull_2_model, charged_model"):
        submissions.create_submission(
            session_for("skin"), "crossbow_3d", "Arm Crossbow",
            {"texture": _png((16, 16)), "model": _model(), "pull_0_model": _model(), "pull_1_model": _model()},
            base_set="crossbows")


def test_single_armour_set_reaches_the_plugin(api, monkeypatch):
    from src.skins import submissions

    _real_files(monkeypatch, ["armor_set"])
    files = {}
    for i, part in enumerate(("helmet", "chestplate", "leggings", "boots")):
        files[f"wild_mage_{part}"] = _png((16, 16), [(i + 1, 9, 9, 255)])
    files["wild_mage_layer_1"] = _png((64, 32), [(1, 1, 1, 255)])
    files["wild_mage_layer_2"] = _png((64, 32), [(2, 2, 2, 255)])
    made = submissions.create_submission(
        session_for("skin"), "armor_set", "Storm Robes", files, tiers=["wild_mage"])
    submissions.approve_submission(made["id"])
    row = api.get("/skins/plugin/approved", headers=PLUGIN).json()["submissions"][0]
    assert row["tiers"] == ["wild_mage"]
    assert row["tier_sets"] == {"wild_mage": "wild mage"}
    assert row["tier_aliases"] == {"wild_mage": "Wild Mage"}


def test_review_sheet_shows_first_frame_and_notes_animation(tmp_path):
    from src.skins.review_sheet import _animated_note, _load_rgba, _single_texture_body

    png = tmp_path / "b.png"
    png.write_bytes(_png((16, 48), [RED, GREEN, BLUE]))
    assert _animated_note(png) == ""
    (tmp_path / "b.png.mcmeta").write_bytes(_meta())
    assert _load_rgba(png).size == (16, 16)
    assert _animated_note(png) == " · animated · 3 frames"
    body = _single_texture_body("b", "bow_3d", None, "longbows", tmp_path)
    assert body.width >= 256
