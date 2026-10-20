"""Regeneration type parsing (fullregen, queued, per-mode variants)."""

from __future__ import annotations

from dataclasses import dataclass

MODES = ["nation", "duchy", "kingdom", "county", "empire", "trade"]

# Every mode drawn as region overlays, which the API serves and tiles alike.
# `coalition` is not in MODES: it is drawn from the coalitions upload by
# `coalitiongen.run_coalition_mode`, not by a regen type of its own.
REGION_LAYER_MODES = [*MODES, "coalition"]


@dataclass(frozen=True)
class RegenSpec:
    """How a regeneration request should run."""

    label: str
    modes: list[str] | None
    full_regions: bool

    @property
    def is_textonly(self) -> bool:
        return self.label.lower() == "textonly"


def parse_regen_type(regen_type: str) -> RegenSpec:
    """Parse API/CLI regen type strings into a structured spec.

    Supported forms:
    - ``fullregen`` — all modes, wipe + rebuild every region overlay
    - ``fullregen:nation`` — one mode only, full wipe for that mode
    - ``queued`` / ``incremental`` — rebuild queued regions only (SF default)
    - ``queued:nation`` — nation mode only, queued regions only
    - ``nation`` (and other mode names) — shorthand for ``queued:nation`` etc.
    - ``textonly`` — compile data only, no map output
    """
    lower = regen_type.lower().strip()

    if lower == "textonly":
        return RegenSpec(label=regen_type, modes=[], full_regions=False)

    if lower == "fullregen":
        return RegenSpec(label=regen_type, modes=None, full_regions=True)

    if lower.startswith("fullregen:"):
        mode = _require_mode(lower.split(":", 1)[1])
        return RegenSpec(label=regen_type, modes=[mode], full_regions=True)

    if lower in ("queued", "incremental"):
        return RegenSpec(label=regen_type, modes=None, full_regions=False)

    if lower.startswith("queued:"):
        mode = _require_mode(lower.split(":", 1)[1])
        return RegenSpec(label=regen_type, modes=[mode], full_regions=False)

    if lower in MODES:
        return RegenSpec(label=regen_type, modes=[lower], full_regions=False)

    raise ValueError(
        f"Unknown regen type '{regen_type}'. "
        f"Use fullregen, fullregen:<mode>, queued, queued:<mode>, or a mode name."
    )


def _require_mode(mode: str) -> str:
    mode = mode.lower().strip()
    if mode not in MODES:
        raise ValueError(f"Unknown map mode '{mode}'. Expected one of: {', '.join(MODES)}")
    return mode


def region_regen_queued(spec: RegenSpec, mode: str) -> bool:
    """Whether region PNG generation should respect the queue (incremental)."""
    if mode == "trade":
        return False
    return not spec.full_regions
