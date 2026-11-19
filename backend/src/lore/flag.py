"""LORE_PANEL switches the panel on or off; unset, it is on everywhere but production
(PS_PRODUCTION=1), so it can be reviewed on dev before it goes live."""
from __future__ import annotations

import os

_ON = ("1", "true", "yes", "on")
_OFF = ("0", "false", "no", "off")


def enabled() -> bool:
    raw = os.environ.get("LORE_PANEL", "").strip().lower()
    if raw in _ON:
        return True
    if raw in _OFF:
        return False
    return os.environ.get("PS_PRODUCTION", "").strip() != "1"
