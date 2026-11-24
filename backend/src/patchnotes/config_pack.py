"""The Main configs the post writer may look things up in.

They come from the AMP backup the week's facts end with. Only gameplay files of
listed plugins are written out. Discoveries, lore, player data and anything that
looks like a login stay out, and so does every file or line with one of the
server's hidden words. Without those words nothing is written. Runs on the host and needs PyYAML, as weekly does.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from .safety import hidden_words
from .weekly import hidden_config, snapshot_from_zip
from .weekly_run import backups, latest_before, week_cutoff, zone

FOLDERS = frozenset({
    "AdvancedCrafting", "ArmourShop", "Cooking", "Dowsing", "Gathering", "GemInfusion", "GunsAndGadgets",
    "InteractibleFurniture", "MMOCore", "MMOItems", "Magic", "MythicLib", "Recycler", "SimpleFactions",
    "Surgery", "Thievery", "VFBuilders", "VehicleFramework", "Woodworking", "activity", "geiger_counter",
})
# MythicMobs also holds bosses and dungeon mobs; only class and rune skills are needed.
PREFIXES = ("MythicMobs/skills/TFMC/Classes/",)
_HIDDEN_PART = re.compile(
    r"dungeon|secret|hidden|lore|codex|research|staff|admin|test|referral", re.IGNORECASE
)
_LOGIN = re.compile(
    r"(?i)^\s*[\w.\-]*(pass(word)?|token|secret|webhook|api[_-]?key|jdbc|mysql|username|host(name)?)[\w.\-]*\s*:"
)
# A file that names player accounts is runtime data, whatever its name.
_ACCOUNT = re.compile(r"(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_URL = re.compile(r"(?i)\b(https?|jdbc:\w+|mysql|mongodb)://\S+")


def allowed(relative: str, words: re.Pattern[str]) -> bool:
    if hidden_config(relative) or _HIDDEN_PART.search(relative) or words.search(relative):
        return False
    return relative.split("/", 1)[0] in FOLDERS or relative.startswith(PREFIXES)


def cleaned(text: str, words: re.Pattern[str]) -> str:
    return "\n".join(
        _URL.sub("(removed)", line) for line in text.splitlines()
        if not _LOGIN.match(line) and not words.search(line)
    ) + "\n"


def write_pack(week: str, backups_dir: Path, target: Path) -> int:
    """Write the week's final configs under `target` and return how many there are."""
    words = hidden_words()
    if words is None:
        return 0
    found = latest_before(backups(backups_dir), week_cutoff(week, zone()))
    if found is None:
        return 0
    root = target.resolve()
    count = 0
    for relative, text in snapshot_from_zip(found[1]).files.items():
        if not allowed(relative, words) or _ACCOUNT.search(text):
            continue
        path = (root / relative).resolve()
        if not path.is_relative_to(root):
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(cleaned(text, words), encoding="utf-8", newline="\n")
        count += 1
    return count


def is_current(week: str, now: datetime | None = None) -> bool:
    """Only a closed week has its final backup."""
    return week_cutoff(week, zone()) <= (now or datetime.now(timezone.utc))
