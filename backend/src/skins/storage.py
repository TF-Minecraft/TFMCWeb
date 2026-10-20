"""Write fixed-stem PNG/JSON files for skins submissions."""

from __future__ import annotations

import json
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

from .animation import AnimationError, mcmeta_bytes, parse_mcmeta
from .db import SKINS_DIR
from .display import DisplayError, parse_and_merge_model
from .naming import (
    ARMOR_LAYER_FIELDS,
    BOOK_FIELDS,
    BOW_3D_MODEL_FIELDS,
    BOW_FRAME_FIELDS,
    CROSSBOW_3D_MODEL_FIELDS,
    CROSSBOW_FRAME_FIELDS,
    MCMETA_SUFFIX,
)
from .pack_models.gun import build_gun_models
from .pack_models.large_bow import bow_file_suffix, build_large_bow_models
from .pack_models.large_handheld import (
    build_large_handheld_model,
    parse_grip_preset,
)
from .pack_models.shield import build_shield_models
from .pack_models.textures import (
    model_to_bytes as pack_model_to_bytes,
    normalize_textures,
)

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
MAX_PNG_BYTES = 2 * 1024 * 1024
MAX_JSON_BYTES = 512 * 1024

ICON_SIZE = (16, 16)
LAYER_SIZE = (64, 32)
ITEM_SIZE = (16, 16)
LARGE_HANDHELD_SIZE = (32, 32)
BOW_SIZE = (16, 16)
LARGE_BOW_SIZE = (32, 32)
CROSSBOW_SIZE = (16, 16)

BOW_KINDS = frozenset({"bow", "large_bow"})
CROSSBOW_KINDS = frozenset({"crossbow"})
# One texture and a model per bow state; see naming.BOW_3D_MODEL_FIELDS.
RANGED_3D_KINDS = frozenset({"bow_3d", "crossbow_3d"})
# Model field → file suffix after the slug ({slug}.json, {slug}_0.json, …).
RANGED_3D_MODEL_SUFFIX = {
    "model": "",
    "pull_0_model": "_0",
    "pull_1_model": "_1",
    "pull_2_model": "_2",
    "charged_model": "_charged",
}
ITEM_KINDS = frozenset({"handheld", "large_handheld", "item"})
MODEL_3D_KINDS = frozenset({"item_3d", "shield", "helmet_3d", "mask"})
GUN_KIND = "gun"
BOOK_KIND = "book"
GUN_MODEL_FIELDS = ("carry_model", "reload_model", "aim_model")
GUN_MODEL_STEMS = ("carry", "reload", "aim")


class StorageError(ValueError):
    """Invalid upload bytes or kind."""


def png_dimensions(data: bytes) -> tuple[int, int]:
    if len(data) < 24:
        raise StorageError("PNG too short to read dimensions")
    if data[12:16] != b"IHDR":
        raise StorageError("PNG missing IHDR chunk")
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def validate_png(
    data: bytes, expected: tuple[int, int] | None = None
) -> None:
    if not data:
        raise StorageError("Empty file")
    if len(data) > MAX_PNG_BYTES:
        raise StorageError(f"PNG exceeds max size ({MAX_PNG_BYTES} bytes)")
    if not data.startswith(PNG_MAGIC):
        raise StorageError("File is not a valid PNG")
    if expected is not None:
        width, height = png_dimensions(data)
        exp_w, exp_h = expected
        if (width, height) != expected:
            raise StorageError(
                f"PNG must be {exp_w}x{exp_h}, got {width}x{height}"
            )


def validate_model_json_size(data: bytes) -> None:
    if not data:
        raise StorageError("Empty model JSON")
    if len(data) > MAX_JSON_BYTES:
        raise StorageError(
            f"Model JSON exceeds max size ({MAX_JSON_BYTES} bytes)"
        )


def ranged_3d_model_fields(kind: str) -> tuple[str, ...]:
    return CROSSBOW_3D_MODEL_FIELDS if kind == "crossbow_3d" else BOW_3D_MODEL_FIELDS


def check_mcmeta_fields(files: dict[str, bytes]) -> None:
    """Every ``{field}_mcmeta`` needs an uploaded PNG ``field`` that is not an armour layer."""
    for key in files:
        if not key.endswith(MCMETA_SUFFIX):
            continue
        field = key[: -len(MCMETA_SUFFIX)]
        if any(field.endswith(f"_{layer}") or field == layer for layer in ARMOR_LAYER_FIELDS):
            raise StorageError(
                f"{key}: armour layer textures cannot be animated"
            )
        data = files.get(field)
        if not data or not data.startswith(PNG_MAGIC):
            raise StorageError(f"{key}: no PNG '{field}' to animate")


def _write_png(
    out_dir: Path,
    files: dict[str, bytes],
    field: str,
    names: tuple[str, ...],
    expected: tuple[int, int] | None = None,
) -> None:
    """Validate ``field`` and write it as each of ``names``, with ``{name}.mcmeta`` if animated.

    An animated PNG with a fixed ``expected`` size must be a grid of frames that size.
    """
    if field not in files:
        raise StorageError(f"Missing file field: {field}")
    data = files[field]
    meta = files.get(field + MCMETA_SUFFIX)
    clean: bytes | None = None
    if meta is None:
        validate_png(data, expected)
    else:
        validate_png(data)
        try:
            parsed, _ = parse_mcmeta(
                meta, png_dimensions(data), expected, label=field
            )
        except AnimationError as e:
            raise StorageError(str(e)) from e
        clean = mcmeta_bytes(parsed)
    for name in names:
        (out_dir / name).write_bytes(data)
        if clean is not None:
            (out_dir / f"{name}.mcmeta").write_bytes(clean)


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _expected_bow_size(kind: str) -> tuple[int, int]:
    if kind == "large_bow":
        return LARGE_BOW_SIZE
    if kind == "crossbow":
        return CROSSBOW_SIZE
    return BOW_SIZE


def _write_bow_frames(
    out_dir: Path,
    slug: str,
    kind: str,
    files: dict[str, bytes],
    fields: tuple[str, ...],
) -> None:
    size = _expected_bow_size(kind)
    for field in fields:
        if field == "texture":
            names: tuple[str, ...] = (f"{slug}.png",)
        elif field.startswith("pull_"):
            n = field.split("_", 1)[1]
            names = (f"{slug}_{n}.png",)
        elif field == "charged":
            names = (f"{slug}_charged.png", f"{slug}_arrow.png")
        else:
            raise StorageError(f"Unknown bow field: {field}")
        _write_png(out_dir, files, field, names, size)


def _write_model_3d(
    out_dir: Path, slug: str, kind: str, files: dict[str, bytes]
) -> None:
    if "texture" not in files:
        raise StorageError("Missing file field: texture")
    if "model" not in files:
        raise StorageError("Missing file field: model")
    validate_model_json_size(files["model"])
    try:
        model = parse_and_merge_model(files["model"], kind)
    except DisplayError as e:
        raise StorageError(str(e)) from e
    _write_png(out_dir, files, "texture", (f"{slug}.png",))
    if kind == "shield":
        idle, blocking = build_shield_models(model, slug)
        (out_dir / f"{slug}.json").write_bytes(pack_model_to_bytes(idle))
        (out_dir / f"{slug}_blocking.json").write_bytes(
            pack_model_to_bytes(blocking)
        )
    else:
        normalized = normalize_textures(model, slug)
        (out_dir / f"{slug}.json").write_bytes(pack_model_to_bytes(normalized))


def _write_ranged_3d(
    out_dir: Path, slug: str, kind: str, files: dict[str, bytes]
) -> None:
    """3D bow / crossbow: {slug}.png plus {slug}.json, _0, _1, _2 (and _charged)."""
    built: dict[str, bytes] = {}
    for field in ranged_3d_model_fields(kind):
        if field not in files:
            raise StorageError(f"Missing file field: {field}")
        validate_model_json_size(files[field])
        try:
            model = parse_and_merge_model(files[field], kind)
        except DisplayError as e:
            raise StorageError(f"{field}: {e}") from e
        name = f"{slug}{RANGED_3D_MODEL_SUFFIX[field]}.json"
        built[name] = pack_model_to_bytes(normalize_textures(model, slug))
    _write_png(out_dir, files, "texture", (f"{slug}.png",))
    for name, data in built.items():
        (out_dir / name).write_bytes(data)


def _write_gun(out_dir: Path, slug: str, files: dict[str, bytes]) -> None:
    _write_png(out_dir, files, "texture", (f"{slug}.png",))
    merged: dict[str, dict] = {}
    for field, stem in zip(GUN_MODEL_FIELDS, GUN_MODEL_STEMS, strict=True):
        if field not in files:
            raise StorageError(f"Missing file field: {field}")
        validate_model_json_size(files[field])
        try:
            merged[stem] = parse_and_merge_model(files[field], "gun")
        except DisplayError as e:
            raise StorageError(f"{field}: {e}") from e
    built = build_gun_models(merged, slug)
    for stem, model in built.items():
        (out_dir / f"{slug}_{stem}.json").write_bytes(pack_model_to_bytes(model))


def _write_large_handheld(
    out_dir: Path, slug: str, files: dict[str, bytes], grip_preset: str | None
) -> None:
    try:
        grip = parse_grip_preset(grip_preset)
    except ValueError as e:
        raise StorageError(str(e)) from e
    _write_png(out_dir, files, "texture", (f"{slug}.png",), LARGE_HANDHELD_SIZE)
    (out_dir / f"{slug}.json").write_bytes(
        pack_model_to_bytes(build_large_handheld_model(slug, grip))
    )


def _write_large_bow_models(out_dir: Path, slug: str) -> None:
    for stem, model in build_large_bow_models(slug).items():
        name = f"{slug}{bow_file_suffix(stem)}.json"
        (out_dir / name).write_bytes(pack_model_to_bytes(model))


def _write_armor(
    out_dir: Path,
    files: dict[str, bytes],
    tiers: list[str],
    helmet_3d_tiers: list[str],
) -> None:
    helmet_3d = set(helmet_3d_tiers)
    for tier in tiers:
        for field in ARMOR_LAYER_FIELDS:
            key = f"{tier}_{field}"
            if key not in files:
                raise StorageError(f"Missing file field: {key}")
            validate_png(files[key], LAYER_SIZE)
            (out_dir / f"{tier}_{field}.png").write_bytes(files[key])

        for field in ("chestplate", "leggings", "boots"):
            key = f"{tier}_{field}"
            _write_png(out_dir, files, key, (f"{key}.png",), ICON_SIZE)

        if tier in helmet_3d:
            model_key = f"{tier}_helmet_model"
            tex_key = f"{tier}_helmet_texture"
            if model_key not in files:
                raise StorageError(f"Missing file field: {model_key}")
            if tex_key not in files:
                raise StorageError(f"Missing file field: {tex_key}")
            validate_model_json_size(files[model_key])
            try:
                model = parse_and_merge_model(
                    files[model_key], "armor_helmet_3d"
                )
            except DisplayError as e:
                raise StorageError(str(e)) from e
            _write_png(out_dir, files, tex_key, (f"{tex_key}.png",))
            # Pack slug at apply is {submission_id}_{tier}; texture id matches.
            texture_id = f"{out_dir.name}_{tier}_helmet"
            normalized = normalize_textures(model, texture_id)
            (out_dir / f"{tier}_helmet_model.json").write_bytes(
                pack_model_to_bytes(normalized)
            )
        else:
            key = f"{tier}_helmet"
            _write_png(out_dir, files, key, (f"{key}.png",), ICON_SIZE)


def write_submission_files(
    submission_id: str,
    slug: str,
    kind: str,
    display_name: str,
    files: dict[str, bytes],
    grip_preset: str | None = None,
    base_set: str | None = None,
    *,
    tiers: list[str] | None = None,
    helmet_3d_tiers: list[str] | None = None,
    add_name: bool = False,
    name_colours: list[str] | None = None,
    name_styles: list[str] | None = None,
    tier_aliases: dict[str, str] | None = None,
) -> Path:
    """
    Write assets under SKINS_DIR/{submission_id}/ with fixed stems.
    Upload filenames are ignored; `files` keys are logical field names.
    """
    out_dir = SKINS_DIR / submission_id
    out_dir.mkdir(parents=True, exist_ok=True)
    h3d = list(helmet_3d_tiers or [])

    try:
        check_mcmeta_fields(files)
        if kind == "armor_set":
            tier_list = list(tiers or [])
            if not tier_list:
                raise StorageError("armor_set requires at least one tier")
            _write_armor(out_dir, files, tier_list, h3d)
        elif kind == "large_handheld":
            _write_large_handheld(out_dir, slug, files, grip_preset)
        elif kind == "handheld":
            _write_png(out_dir, files, "texture", (f"{slug}.png",), ITEM_SIZE)
        elif kind == "large_bow":
            _write_bow_frames(out_dir, slug, kind, files, BOW_FRAME_FIELDS)
            _write_large_bow_models(out_dir, slug)
        elif kind == "bow":
            _write_bow_frames(out_dir, slug, kind, files, BOW_FRAME_FIELDS)
        elif kind in CROSSBOW_KINDS:
            _write_bow_frames(
                out_dir, slug, kind, files, CROSSBOW_FRAME_FIELDS
            )
        elif kind in MODEL_3D_KINDS:
            _write_model_3d(out_dir, slug, kind, files)
        elif kind in RANGED_3D_KINDS:
            _write_ranged_3d(out_dir, slug, kind, files)
        elif kind == GUN_KIND:
            _write_gun(out_dir, slug, files)
        elif kind == BOOK_KIND:
            for field in BOOK_FIELDS:
                _write_png(
                    out_dir, files, field, (f"{slug}_{field}.png",), ITEM_SIZE
                )
        else:
            raise StorageError(f"Unsupported kind: {kind}")

        meta = {
            "id": submission_id,
            "slug": slug,
            "kind": kind,
            "display_name": display_name,
            "grip_preset": grip_preset,
            "base_set": base_set,
            "tiers": list(tiers or []),
            "helmet_3d_tiers": h3d,
            "tier_aliases": dict(tier_aliases or {}),
            "add_name": bool(add_name),
            "name_colours": list(name_colours or []),
            "name_styles": list(name_styles or []),
            "created_at": _iso_now(),
        }
        (out_dir / "meta.json").write_text(
            json.dumps(meta, indent=2) + "\n",
            encoding="utf-8",
        )
    except Exception:
        if out_dir.exists():
            shutil.rmtree(out_dir, ignore_errors=True)
        raise

    return out_dir
