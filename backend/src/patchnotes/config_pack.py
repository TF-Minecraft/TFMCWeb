"""The Main configs the post writer may look things up in.

They come from the AMP backup the week's facts end with. Only gameplay files of
listed plugins are written out. Discoveries, lore, player data and logins stay
out, and so does every file or line with one of the server's hidden words.
Without those words nothing is written. Runs on the host with weekly_run, the
only job that can read the backups, and needs PyYAML as weekly does.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Any

import yaml

from .safety import hidden_words
from .weekly import hidden_config, snapshot_from_zip

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
    r"(?i)password|passwd|webhook|api[\W_]*key|jdbc|mysql"
    r"|(?<![a-z])(?:pass|tokens?|secrets?|user(?:name)?|host(?:name)?)(?![a-z])"
)
_CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
# A file that names player accounts is runtime data, whatever its name.
_ACCOUNT = re.compile(r"(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_URL = re.compile(r"(?i)\b(https?|jdbc:\w+|mysql|mongodb)://\S+")


def allowed(relative: str, words: re.Pattern[str]) -> bool:
    if hidden_config(relative) or _HIDDEN_PART.search(relative) or words.search(relative):
        return False
    return relative.split("/", 1)[0] in FOLDERS or relative.startswith(PREFIXES)


def _login(key: object) -> bool:
    return bool(_LOGIN.search(_CAMEL.sub("_", str(key))))


def _without_logins(node: Any) -> Any:
    if isinstance(node, dict):
        return {key: _without_logins(value) for key, value in node.items() if not _login(key)}
    if isinstance(node, list):
        return [_without_logins(value) for value in node]
    return node


def cleaned(text: str, words: re.Pattern[str]) -> str | None:
    """The text without logins, links and hidden words, or None when it cannot be read safely.

    A value can span lines, so a file with a login is written again from its parsed
    form. The line check then covers comments and text inside values.
    """
    try:
        loaded = yaml.safe_load(text)
        pruned = _without_logins(loaded)
        if pruned != loaded:
            text = yaml.safe_dump(pruned, sort_keys=False, allow_unicode=True)
    except (yaml.YAMLError, RecursionError):
        return None
    return "\n".join(
        _URL.sub("(removed)", line) for line in text.splitlines()
        if not (":" in line and _login(line.split(":", 1)[0])) and not words.search(line)
    ) + "\n"


def write_pack(backup: Path, target: Path) -> int:
    """Write the configs of one backup under `target` and return how many there are."""
    words = hidden_words()
    if words is None:
        return 0
    root = target.resolve()
    count = 0
    for relative, text in snapshot_from_zip(backup).files.items():
        if not allowed(relative, words) or _ACCOUNT.search(text):
            continue
        path = (root / relative).resolve()
        if not path.is_relative_to(root):
            continue
        content = cleaned(text, words)
        if content is None:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        count += 1
    return count


def keep_pack(backup: Path, week: str, directory: Path) -> int:
    """Write the week's pack to `directory/<week>`, whole or not at all. Other weeks go."""
    for old in directory.iterdir():
        shutil.rmtree(old)
    building = directory / f".{week}"
    count = write_pack(backup, building)
    if count:
        building.rename(directory / week)
    return count
