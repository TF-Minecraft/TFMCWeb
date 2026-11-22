"""Vehicle skins: which vehicles can be repainted and the size of each texture.

Reads shared/skins/vehicle_skins.json, generated from Main's vehicle models by
frontend/scripts/build-vehicle-skin-templates.mjs; the upload page reads the same file.
A vehicle skin replaces every texture of the vehicle's default model and keeps its shape
(ArmourShop VehicleSkinWriter), so each texture is uploaded at its exact size, in model
order, as fields ``texture_0`` … ``texture_{n-1}``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

VEHICLE_KIND = "vehicle"

# backend/src/skins → repository root
_ROOT = Path(__file__).resolve().parents[3]
_VEHICLE_SKINS_PATH = _ROOT / "shared" / "skins" / "vehicle_skins.json"


@dataclass(frozen=True)
class VehicleTexture:
    width: int
    height: int
    sha256: str


@dataclass(frozen=True)
class VehicleSpec:
    id: str
    label: str
    textures: tuple[VehicleTexture, ...]


@lru_cache(maxsize=1)
def vehicle_specs() -> dict[str, VehicleSpec]:
    with _VEHICLE_SKINS_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    out: dict[str, VehicleSpec] = {}
    for row in data["vehicles"]:
        out[row["id"]] = VehicleSpec(
            id=row["id"],
            label=row["label"],
            textures=tuple(
                VehicleTexture(int(t["width"]), int(t["height"]), str(t["sha256"]))
                for t in row["textures"]
            ),
        )
    return out


def texture_field(index: int) -> str:
    return f"texture_{index}"


def texture_fields(vehicle_id: str) -> tuple[str, ...]:
    spec = vehicle_specs()[vehicle_id]
    return tuple(texture_field(i) for i in range(len(spec.textures)))


def texture_file_name(slug: str, index: int) -> str:
    """What ArmourShop downloads: ``{slug}_{n}.png``, n in the model's texture order."""
    return f"{slug}_{index}.png"
