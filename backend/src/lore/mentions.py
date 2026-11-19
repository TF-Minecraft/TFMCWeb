"""Links inside long text: `[[kind:id|Shown name]]`. Each save rebuilds the source's
`lore_mentions` rows; a record's backlinks are the live records that mention it."""
from __future__ import annotations

import re
from typing import Iterable

from src import database

LINK_KINDS = ("character", "organisation", "storyline", "event", "location")
TOKEN_RE = re.compile(r"\[\[(" + "|".join(LINK_KINDS) + r"):(\d{1,18})(?:\|[^\]\n]{0,200})?\]\]")
MAX_LINKS = 500


def parse(texts: Iterable[str | None]) -> list[tuple[str, int]]:
    """The distinct (kind, id) links in the texts, in order of first appearance."""
    seen: dict[tuple[str, int], None] = {}
    for text in texts:
        for match in TOKEN_RE.finditer(text or ""):
            seen.setdefault((match.group(1), int(match.group(2))), None)
            if len(seen) >= MAX_LINKS:
                return list(seen)
    return list(seen)


def rebuild(conn: database.Connection, kind: str, source_id: int, texts: Iterable[str | None]) -> None:
    links = [(k, i) for k, i in parse(texts) if not (k == kind and i == source_id)]
    conn.execute("DELETE FROM lore_mentions WHERE source_kind = %s AND source_id = %s", (kind, source_id))
    if links:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO lore_mentions (source_kind, source_id, target_kind, target_id) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT DO NOTHING",
                [(kind, source_id, k, i) for k, i in links],
            )
