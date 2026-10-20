"""Combined texture+model byte budgets for 3D skin kinds.

A texture's optional ``.mcmeta`` counts toward its pair.
"""

from __future__ import annotations

from .base_sets import ranged_3d_total_bytes


class SizeLimitError(ValueError):
    """Texture + model pair exceeds configured budget."""


def _pair_len(texture: bytes | None, model: bytes | None) -> int:
    return len(texture or b"") + len(model or b"")


def assert_pair(
    texture: bytes | None,
    model: bytes | None,
    max_bytes: int,
    *,
    label: str,
    mcmeta: bytes | None = None,
) -> None:
    total = _pair_len(texture, model) + len(mcmeta or b"")
    cap = max(0, int(max_bytes))
    if total > cap:
        raise SizeLimitError(
            f"{label}: texture + model is {total} bytes "
            f"(limit {cap} bytes)"
        )


def assert_3d_pair_budgets(
    kind: str,
    files_bytes: dict[str, bytes],
    max_bytes: int,
    *,
    helmet_3d_tiers: list[str] | None = None,
) -> None:
    """Enforce ArmourShop max-3d-pair-bytes for applicable kinds."""
    k = (kind or "").strip()
    cap = max(0, int(max_bytes))

    if k in ("bow_3d", "crossbow_3d"):
        # One fixed budget for every rank, across all of the upload's files.
        limit = ranged_3d_total_bytes()
        total = sum(len(data or b"") for data in files_bytes.values())
        if total > limit:
            raise SizeLimitError(
                f"{k}: texture + models is {total} bytes (limit {limit} bytes)"
            )
        return

    if k in ("item_3d", "shield", "helmet_3d", "mask"):
        assert_pair(
            files_bytes.get("texture"),
            files_bytes.get("model"),
            cap,
            label=k,
            mcmeta=files_bytes.get("texture_mcmeta"),
        )
        return

    if k == "gun":
        texture = files_bytes.get("texture")
        for stem in ("carry_model", "reload_model", "aim_model"):
            assert_pair(
                texture,
                files_bytes.get(stem),
                cap,
                label=f"gun/{stem}",
                mcmeta=files_bytes.get("texture_mcmeta"),
            )
        return

    if k == "armor_set" and helmet_3d_tiers:
        for tier in helmet_3d_tiers:
            t = str(tier or "").strip()
            if not t:
                continue
            assert_pair(
                files_bytes.get(f"{t}_helmet_texture"),
                files_bytes.get(f"{t}_helmet_model"),
                cap,
                label=f"armor_set/{t}_helmet",
                mcmeta=files_bytes.get(f"{t}_helmet_texture_mcmeta"),
            )
