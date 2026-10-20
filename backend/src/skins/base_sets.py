"""Load what player skins can apply to (ProvinceSystem/shared/skins/base_sets.json).

The frontend reads the same file, so the upload picker and these checks agree.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# backend/src/skins → ProvinceSystem/
_PROVINCE_ROOT = Path(__file__).resolve().parents[3]
_BASE_SETS_PATH = _PROVINCE_ROOT / "shared" / "skins" / "base_sets.json"


@lru_cache(maxsize=1)
def load_base_sets() -> dict[str, Any]:
    with _BASE_SETS_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise RuntimeError(f"Invalid base sets at {_BASE_SETS_PATH}")
    return data


def base_sets_by_kind() -> dict[str, frozenset[str]]:
    """Upload kind → ArmourShop base set ids it may target (armour excluded)."""
    out: dict[str, set[str]] = {}
    for row in load_base_sets()["base_sets"]:
        for kind in row["kinds"]:
            out.setdefault(kind, set()).add(row["id"])
    return {kind: frozenset(ids) for kind, ids in out.items()}


def armor_single_sets() -> dict[str, str]:
    """Single armour set tier id → label (``wild_mage`` → ``Wild Mage``)."""
    return {
        row["id"]: row["label"] for row in load_base_sets()["armor"]["single_sets"]
    }


def limit(name: str) -> int:
    return int(load_base_sets()["limits"][name])


def ranged_3d_total_bytes() -> int:
    """Every file of a bow_3d / crossbow_3d upload together, for every rank."""
    return limit("ranged_3d_total_bytes")


def mcmeta_max_bytes() -> int:
    return limit("mcmeta_max_bytes")
