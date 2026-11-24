"""Player-facing notes must not teach hidden knowledge.

Lore items are hidden knowledge. A line may say that something was fixed, but
it must not name a lore item or describe how to find one. Staff still choose
Approve or Deny. This only marks the line for them.
"""

from __future__ import annotations

import os
import re

_LORE_ITEM = re.compile(r"\blore[\s-]?items?\b", re.IGNORECASE)

_WARNING = "Lore items are hidden knowledge. Deny this line if it would reveal one."


def hidden_words() -> re.Pattern[str] | None:
    """The server's own hidden names, from PATCHNOTES_HIDDEN_WORDS (comma separated).

    They live on the host because this repository is public. Without them, callers
    that would pass on developer text or configs pass on nothing.
    """
    words = [word.strip() for word in os.environ.get("PATCHNOTES_HIDDEN_WORDS", "").split(",") if word.strip()]
    if not words:
        return None
    return re.compile("|".join(re.escape(word) for word in words), re.IGNORECASE)


def hidden_knowledge_warning(body: str) -> str | None:
    """Return a staff warning when the line mentions a lore item."""
    if _LORE_ITEM.search(body or ""):
        return _WARNING
    return None
