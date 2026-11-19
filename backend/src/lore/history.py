"""Who changed what in the panel (`lore_history`), written in the same transaction as the change."""
from __future__ import annotations

from typing import Any

from fastapi.encoders import jsonable_encoder

from src import database

from .people import Viewer

MAX_ROWS = 200


def record(
    conn: database.Connection,
    kind: str,
    entity_id: int,
    action: str,
    actor: Viewer,
    changes: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        "INSERT INTO lore_history (entity_kind, entity_id, action, actor_user_id, actor_name, changes) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (kind, entity_id, action, actor.user_id, actor.name, database.Jsonb(jsonable_encoder(changes or {}))),
    )


def for_entity(kind: str, entity_id: int, limit: int = MAX_ROWS) -> list[dict]:
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT id, action, actor_user_id, actor_name, at, changes FROM lore_history "
            "WHERE entity_kind = %s AND entity_id = %s ORDER BY at DESC, id DESC LIMIT %s",
            (kind, entity_id, max(1, min(MAX_ROWS, limit))),
        ).fetchall()
    return [dict(row) for row in rows]
