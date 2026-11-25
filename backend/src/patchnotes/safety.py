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
_NAME_WARNING = "This names something players must not learn. The website leaves it out."


def hidden_words() -> re.Pattern[str] | None:
    """The server's own hidden names, from PATCHNOTES_HIDDEN_WORDS (comma separated).

    They live on the host because this repository is public. Without them, callers
    that would pass on developer text or configs pass on nothing. A space or `_` in a name
    also matches `-` or nothing. A `-` only matches itself.
    """
    words = [word.strip() for word in os.environ.get("PATCHNOTES_HIDDEN_WORDS", "").split(",") if word.strip()]
    if not words:
        return None
    return re.compile("|".join(_flexible(word) for word in words), re.IGNORECASE)


def _flexible(word: str) -> str:
    return r"[\s_-]?".join(re.escape(part) for part in re.split(r"[\s_]+", word) if part) or re.escape(word)


def names_hidden(body: str) -> bool:
    """True when the line carries one of the server's hidden names."""
    words = hidden_words()
    return words is not None and words.search(body or "") is not None


def hidden_knowledge_warning(body: str) -> str | None:
    """Return a staff warning when the line mentions a lore item or a hidden name."""
    if _LORE_ITEM.search(body or ""):
        return _WARNING
    if names_hidden(body):
        return _NAME_WARNING
    return None
