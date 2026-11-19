"""The five kinds of lore record (characters, organisations, storylines, events,
locations): list, detail with every link, create, edit, soft delete and restore.

Edits carry the `version` the editor loaded; a stale one is refused with
`edited_elsewhere` and the current record, so two people never silently
overwrite each other. Every write records history in the same transaction.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from fastapi.encoders import jsonable_encoder

from src import database

from . import history, mentions, notifications
from .errors import LoreError, bad, not_found
from .people import NAME_SQL, PERSON_JOINS, Viewer

LIST_LIMIT = 1000
SHORT_TEXT = 2000
LONG_TEXT = 20000


@dataclass(frozen=True)
class Field:
    name: str
    type: str  # text | enum | int | date | datetime | ref
    max_len: int = 0
    choices: tuple[str, ...] = ()
    nullable: bool = False
    lo: int | None = None
    hi: int | None = None
    ref: str | None = None
    default: Any = None
    required: bool = False  # text: blank is refused with bad_<name>


@dataclass(frozen=True)
class Kind:
    name: str
    plural: str
    table: str
    label: str
    fields: tuple[Field, ...]
    long_text: tuple[str, ...]
    list_columns: str
    order: str = "lower(t.{label}), t.id"
    statuses: tuple[str, ...] = field(default=())

    def field(self, name: str) -> Field | None:
        return next((f for f in self.fields if f.name == name), None)


def _text(name: str, max_len: int) -> Field:
    return Field(name, "text", max_len=max_len, default="")


CHARACTER_STATUSES = ("active", "inactive", "missing", "dead")
STORYLINE_STATUSES = ("planning", "active", "concluded", "abandoned")
EVENT_STATUSES = ("idea", "waiting", "scheduled", "done", "cancelled")
LOCATION_KINDS = ("settlement", "landmark", "camp", "ruin", "event", "other")
COORD = 30_000_000

KINDS: dict[str, Kind] = {
    "character": Kind(
        name="character",
        plural="characters",
        table="lore_characters",
        label="name",
        fields=(
            _text("name", 120),
            Field("status", "enum", choices=CHARACTER_STATUSES, default="active"),
            _text("summary", SHORT_TEXT),
            _text("notes", LONG_TEXT),
        ),
        long_text=("summary", "notes"),
        statuses=CHARACTER_STATUSES,
        list_columns=(
            "t.id, t.name, t.status, t.summary, t.player_name, t.version, "
            "(t.face_png IS NOT NULL OR t.player_uuid IS NOT NULL) AS has_face, t.updated_at, t.deleted_at, "
            "(SELECT coalesce(array_agg(o.name ORDER BY lower(o.name)), '{}') FROM lore_character_affiliations a "
            " JOIN lore_organisations o ON o.id = a.organisation_id AND o.deleted_at IS NULL "
            " WHERE a.character_id = t.id) AS organisations"
        ),
    ),
    "organisation": Kind(
        name="organisation",
        plural="organisations",
        table="lore_organisations",
        label="name",
        fields=(
            _text("name", 120),
            _text("kind", 60),
            _text("game_faction", 120),
            _text("summary", SHORT_TEXT),
            _text("notes", LONG_TEXT),
        ),
        long_text=("summary", "notes"),
        list_columns=(
            "t.id, t.name, t.kind, t.game_faction, t.summary, t.updated_at, t.deleted_at, "
            "(SELECT count(*) FROM lore_character_affiliations a JOIN lore_characters c "
            " ON c.id = a.character_id AND c.deleted_at IS NULL WHERE a.organisation_id = t.id) AS member_count"
        ),
    ),
    "storyline": Kind(
        name="storyline",
        plural="storylines",
        table="lore_storylines",
        label="title",
        fields=(
            _text("title", 120),
            Field("status", "enum", choices=STORYLINE_STATUSES, default="planning"),
            _text("summary", SHORT_TEXT),
            _text("notes", LONG_TEXT),
        ),
        long_text=("summary", "notes"),
        statuses=STORYLINE_STATUSES,
        list_columns=(
            "t.id, t.title, t.status, t.summary, t.updated_at, t.deleted_at, "
            "(SELECT count(*) FROM lore_events e WHERE e.storyline_id = t.id AND e.deleted_at IS NULL) AS event_count, "
            "(SELECT min(e.scheduled_on) FROM lore_events e WHERE e.storyline_id = t.id AND e.deleted_at IS NULL "
            " AND e.status = 'scheduled' AND e.scheduled_on >= current_date) AS next_event_on"
        ),
    ),
    "location": Kind(
        name="location",
        plural="locations",
        table="lore_locations",
        label="name",
        fields=(
            _text("name", 120),
            Field("world", "text", max_len=64, default="TFMC_Map", required=True),
            Field("x", "int", lo=-COORD, hi=COORD, default=0),
            Field("y", "int", lo=-2048, hi=2048, nullable=True),
            Field("z", "int", lo=-COORD, hi=COORD, default=0),
            Field("kind", "enum", choices=LOCATION_KINDS, default="other"),
            _text("summary", SHORT_TEXT),
            _text("notes", LONG_TEXT),
        ),
        long_text=("summary", "notes"),
        list_columns="t.id, t.name, t.world, t.x, t.y, t.z, t.kind, t.summary, t.updated_at, t.deleted_at",
    ),
    "event": Kind(
        name="event",
        plural="events",
        table="lore_events",
        label="title",
        fields=(
            _text("title", 120),
            Field("status", "enum", choices=EVENT_STATUSES, default="idea"),
            Field("storyline_id", "ref", ref="storyline", nullable=True),
            Field("scheduled_on", "date", nullable=True),
            Field("starts_at", "datetime", nullable=True),
            _text("waiting_on", 300),
            Field("location_id", "ref", ref="location", nullable=True),
            _text("summary", SHORT_TEXT),
            _text("notes", LONG_TEXT),
            _text("outcome", LONG_TEXT),
        ),
        long_text=("summary", "notes", "outcome"),
        statuses=EVENT_STATUSES,
        order="t.scheduled_on NULLS LAST, t.starts_at NULLS LAST, t.id",
        list_columns=(
            "t.id, t.title, t.status, t.scheduled_on, t.starts_at, t.waiting_on, t.summary, "
            "t.storyline_id, s.title AS storyline_title, t.storyline_position, "
            "t.location_id, l.name AS location_name, t.updated_at, t.deleted_at"
        ),
    ),
}
BY_PLURAL = {kind.plural: kind for kind in KINDS.values()}
_LIST_JOINS = {
    "event": (
        "LEFT JOIN lore_storylines s ON s.id = t.storyline_id AND s.deleted_at IS NULL "
        "LEFT JOIN lore_locations l ON l.id = t.location_id AND l.deleted_at IS NULL"
    ),
}


def kind_of(name: str) -> Kind:
    kind = KINDS.get(name)
    if kind is None:
        raise not_found()
    return kind


# --------------------
# Validation
# --------------------


def _clean_value(f: Field, value: Any) -> Any:
    if f.type == "text":
        if value is None:
            return f.default if not f.nullable else None
        if not isinstance(value, str):
            raise bad(f"bad_{f.name}")
        value = value.replace("\r\n", "\n")
        if f.required:
            value = value.strip()
            if not value:
                raise bad(f"bad_{f.name}")
        if len(value) > f.max_len:
            raise bad(f"too_long_{f.name}")
        return value
    if f.type == "enum":
        if value not in f.choices:
            raise bad(f"bad_{f.name}")
        return value
    if f.type in ("int", "ref"):
        if value is None or value == "":
            if f.nullable:
                return None
            raise bad(f"bad_{f.name}")
        if isinstance(value, bool) or not isinstance(value, (int, str)):
            raise bad(f"bad_{f.name}")
        try:
            number = int(value)
        except ValueError:
            raise bad(f"bad_{f.name}") from None
        if f.lo is not None and number < f.lo or f.hi is not None and number > f.hi:
            raise bad(f"bad_{f.name}")
        if f.type == "ref" and not 0 < number < 2**63:
            raise bad(f"bad_{f.name}")
        return number
    if f.type == "date":
        if value is None or value == "":
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            raise bad(f"bad_{f.name}") from None
    if f.type == "datetime":
        if value is None or value == "":
            return None
        try:
            parsed = datetime.fromisoformat(str(value))
        except ValueError:
            raise bad(f"bad_{f.name}") from None
        if parsed.tzinfo is None:
            raise bad(f"bad_{f.name}")
        return parsed
    raise AssertionError(f.type)


def clean(kind: Kind, data: dict[str, Any], *, creating: bool) -> dict[str, Any]:
    """The known fields present in `data`, checked and converted. Unknown keys are ignored."""
    if not isinstance(data, dict):
        raise bad("bad_body")
    values = {f.name: _clean_value(f, data[f.name]) for f in kind.fields if f.name in data}
    label = values.get(kind.label)
    if kind.label in values or creating:
        label = (label or "").strip()
        if not label:
            raise bad(f"{kind.label}_required")
        values[kind.label] = label
    return values


def _check_refs(conn: database.Connection, kind: Kind, values: dict[str, Any]) -> None:
    for f in kind.fields:
        if f.type == "ref" and values.get(f.name) is not None and not exists(conn, f.ref, values[f.name]):
            raise bad(f"bad_{f.name}")


def _check_event(merged: dict[str, Any]) -> None:
    if merged.get("status") == "scheduled" and merged.get("scheduled_on") is None:
        raise bad("date_required")
    if merged.get("status") == "waiting" and not (merged.get("waiting_on") or "").strip():
        raise bad("waiting_on_required")


def exists(conn: database.Connection, kind_name: str | None, entity_id: int) -> bool:
    kind = KINDS.get(kind_name or "")
    if kind is None:
        return False
    return (
        conn.execute(f"SELECT 1 FROM {kind.table} WHERE id = %s AND deleted_at IS NULL", (entity_id,)).fetchone()
        is not None
    )


def _locked(conn: database.Connection, kind: Kind, entity_id: int) -> dict:
    row = conn.execute(f"SELECT * FROM {kind.table} WHERE id = %s FOR UPDATE", (entity_id,)).fetchone()
    if row is None:
        raise not_found()
    return row


def _usable(conn: database.Connection, kind: Kind, entity_id: int) -> dict:
    """The record, locked, refusing a deleted one: restore it before changing it."""
    row = _locked(conn, kind, entity_id)
    if row["deleted_at"] is not None:
        raise LoreError(409, "deleted")
    return row


def touch(conn: database.Connection, kind: Kind, entity_id: int, actor: Viewer) -> None:
    """Mark a record edited by a link change, without bumping the version an open form holds."""
    conn.execute(
        f"UPDATE {kind.table} SET updated_at = now(), updated_by = %s WHERE id = %s", (actor.user_id, entity_id)
    )


# --------------------
# Reads
# --------------------


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def list_items(kind: Kind, q: str = "", status: str | None = None, include_deleted: bool = False) -> list[dict]:
    where = ["TRUE"] if include_deleted else ["t.deleted_at IS NULL"]
    params: list[Any] = []
    q = (q or "").strip()[:120]
    if q:
        where.append(f"t.{kind.label} ILIKE %s")
        params.append(_like(q))
    if status:
        if status not in kind.statuses:
            raise bad("bad_status")
        where.append("t.status = %s")
        params.append(status)
    sql = (
        f"SELECT {kind.list_columns} FROM {kind.table} t {_LIST_JOINS.get(kind.name, '')} "
        f"WHERE {' AND '.join(where)} ORDER BY {kind.order.format(label=kind.label)} LIMIT {LIST_LIMIT}"
    )
    with database.connect() as conn:
        return [dict(row) for row in conn.execute(sql, params).fetchall()]


def labels(conn: database.Connection, refs: list[tuple[str, int]]) -> dict[tuple[str, int], dict]:
    """Label, status and deletion of each (kind, id), for links; unknown ones are left out."""
    found: dict[tuple[str, int], dict] = {}
    wanted: dict[str, set[int]] = {}
    for kind_name, entity_id in refs:
        if kind_name in KINDS:
            wanted.setdefault(kind_name, set()).add(int(entity_id))
    for kind_name, ids in wanted.items():
        kind = KINDS[kind_name]
        status = "t.status" if kind.statuses else "NULL::text"
        rows = conn.execute(
            f"SELECT t.id, t.{kind.label} AS label, {status} AS status, t.deleted_at IS NOT NULL AS deleted "
            f"FROM {kind.table} t WHERE t.id = ANY(%s)",
            (sorted(ids),),
        ).fetchall()
        for row in rows:
            found[(kind_name, row["id"])] = {
                "kind": kind_name,
                "id": row["id"],
                "label": row["label"],
                "status": row["status"],
                "deleted": row["deleted"],
            }
    return found


def _live_refs(conn: database.Connection, refs: list[tuple[str, int]]) -> list[dict]:
    named = labels(conn, refs)
    return [named[ref] for ref in refs if ref in named and not named[ref]["deleted"]]


def _relations(conn: database.Connection, kind: str, entity_id: int) -> dict[str, list[dict]]:
    out_rows = conn.execute(
        "SELECT id, target_kind AS kind, target_id AS other_id, type, note FROM lore_relations "
        "WHERE source_kind = %s AND source_id = %s ORDER BY id",
        (kind, entity_id),
    ).fetchall()
    in_rows = conn.execute(
        "SELECT id, source_kind AS kind, source_id AS other_id, type, note FROM lore_relations "
        "WHERE target_kind = %s AND target_id = %s ORDER BY id",
        (kind, entity_id),
    ).fetchall()
    named = labels(conn, [(r["kind"], r["other_id"]) for r in [*out_rows, *in_rows]])

    def shaped(rows: list[dict]) -> list[dict]:
        result = []
        for row in rows:
            other = named.get((row["kind"], row["other_id"]))
            if other is None or other["deleted"]:
                continue
            result.append({"id": row["id"], "type": row["type"], "note": row["note"], "other": other})
        return result

    return {"outgoing": shaped(out_rows), "incoming": shaped(in_rows)}


def _storylines_of(conn: database.Connection, kind: str, entity_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT s.id, s.title AS label, s.status FROM lore_storyline_members m "
        "JOIN lore_storylines s ON s.id = m.storyline_id AND s.deleted_at IS NULL "
        "WHERE m.kind = %s AND m.ref_id = %s ORDER BY lower(s.title), s.id",
        (kind, entity_id),
    ).fetchall()
    return [{"kind": "storyline", **row} for row in rows]


_EVENT_BRIEF = "e.id, e.title AS label, e.status, e.scheduled_on, e.starts_at, e.waiting_on"


def _event_brief(row: dict) -> dict:
    return {"kind": "event", **row}


def _detail(conn: database.Connection, kind: Kind, entity_id: int) -> dict:
    row = conn.execute(
        f"SELECT t.*, (SELECT {NAME_SQL} FROM users u {PERSON_JOINS} WHERE u.id = t.created_by) AS created_by_name, "
        f"(SELECT {NAME_SQL} FROM users u {PERSON_JOINS} WHERE u.id = t.updated_by) AS updated_by_name "
        f"FROM {kind.table} t WHERE t.id = %s",
        (entity_id,),
    ).fetchone()
    if row is None:
        raise not_found()
    item = dict(row)
    item["kind_name"] = kind.name
    if kind.name == "character":
        item["has_skin"] = item.pop("face_png") is not None
        item["has_face"] = item["has_skin"] or bool(item.get("player_uuid"))
        affiliations = conn.execute(
            "SELECT a.organisation_id AS id, o.name AS label, a.role FROM lore_character_affiliations a "
            "JOIN lore_organisations o ON o.id = a.organisation_id AND o.deleted_at IS NULL "
            "WHERE a.character_id = %s ORDER BY lower(o.name), o.id",
            (entity_id,),
        ).fetchall()
        item["affiliations"] = [{"kind": "organisation", **a} for a in affiliations]
        item["relations"] = _relations(conn, "character", entity_id)
        item["storylines"] = _storylines_of(conn, "character", entity_id)
        events = conn.execute(
            f"SELECT {_EVENT_BRIEF} FROM lore_event_characters ec JOIN lore_events e "
            "ON e.id = ec.event_id AND e.deleted_at IS NULL WHERE ec.character_id = %s "
            "ORDER BY e.scheduled_on NULLS LAST, e.id",
            (entity_id,),
        ).fetchall()
        item["events"] = [_event_brief(e) for e in events]
    elif kind.name == "organisation":
        members = conn.execute(
            "SELECT a.character_id AS id, c.name AS label, c.status, a.role FROM lore_character_affiliations a "
            "JOIN lore_characters c ON c.id = a.character_id AND c.deleted_at IS NULL "
            "WHERE a.organisation_id = %s ORDER BY lower(c.name), c.id",
            (entity_id,),
        ).fetchall()
        item["members"] = [{"kind": "character", **m} for m in members]
        item["relations"] = _relations(conn, "organisation", entity_id)
        item["storylines"] = _storylines_of(conn, "organisation", entity_id)
    elif kind.name == "storyline":
        refs = conn.execute(
            "SELECT kind, ref_id FROM lore_storyline_members WHERE storyline_id = %s", (entity_id,)
        ).fetchall()
        members = _live_refs(conn, [(r["kind"], r["ref_id"]) for r in refs])
        item["members"] = sorted(members, key=lambda m: (m["kind"], m["label"].lower(), m["id"]))
        events = conn.execute(
            f"SELECT {_EVENT_BRIEF}, e.storyline_position, e.location_id FROM lore_events e "
            "WHERE e.storyline_id = %s AND e.deleted_at IS NULL "
            "ORDER BY e.storyline_position NULLS LAST, e.scheduled_on NULLS LAST, e.id",
            (entity_id,),
        ).fetchall()
        item["events"] = [_event_brief(e) for e in events]
    elif kind.name == "location":
        item["storylines"] = _storylines_of(conn, "location", entity_id)
        events = conn.execute(
            f"SELECT {_EVENT_BRIEF} FROM lore_events e WHERE e.location_id = %s AND e.deleted_at IS NULL "
            "ORDER BY e.scheduled_on NULLS LAST, e.id",
            (entity_id,),
        ).fetchall()
        item["events"] = [_event_brief(e) for e in events]
    elif kind.name == "event":
        named = labels(
            conn,
            [ref for ref in (("storyline", item["storyline_id"]), ("location", item["location_id"])) if ref[1]],
        )
        item["storyline"] = named.get(("storyline", item["storyline_id"]))
        location = None
        if item["location_id"]:
            location = conn.execute(
                "SELECT id, name AS label, world, x, y, z, kind, deleted_at IS NOT NULL AS deleted "
                "FROM lore_locations WHERE id = %s",
                (item["location_id"],),
            ).fetchone()
        item["location"] = dict(location) if location else None
        characters = conn.execute(
            "SELECT c.id, c.name AS label, c.status FROM lore_event_characters ec "
            "JOIN lore_characters c ON c.id = ec.character_id AND c.deleted_at IS NULL "
            "WHERE ec.event_id = %s ORDER BY lower(c.name), c.id",
            (entity_id,),
        ).fetchall()
        item["characters"] = [{"kind": "character", **c} for c in characters]
        helpers = conn.execute(
            f"SELECT u.id AS user_id, {NAME_SQL} AS name FROM lore_event_helpers h JOIN users u ON u.id = h.user_id "
            f"{PERSON_JOINS} WHERE h.event_id = %s ORDER BY lower({NAME_SQL}), u.id",
            (entity_id,),
        ).fetchall()
        item["helpers"] = [dict(h) for h in helpers]
    backlink_rows = conn.execute(
        "SELECT source_kind, source_id FROM lore_mentions WHERE target_kind = %s AND target_id = %s "
        "ORDER BY source_kind, source_id",
        (kind.name, entity_id),
    ).fetchall()
    item["backlinks"] = _live_refs(conn, [(r["source_kind"], r["source_id"]) for r in backlink_rows])
    return item


def detail(kind: Kind, entity_id: int) -> dict:
    with database.connect() as conn:
        return _detail(conn, kind, entity_id)


def deleted_items() -> list[dict]:
    parts = [
        f"SELECT '{kind.name}' AS kind, id, {kind.label} AS label, deleted_at FROM {kind.table} "
        "WHERE deleted_at IS NOT NULL"
        for kind in KINDS.values()
    ]
    with database.connect() as conn:
        rows = conn.execute(" UNION ALL ".join(parts) + " ORDER BY deleted_at DESC LIMIT 500").fetchall()
    return [dict(row) for row in rows]


# --------------------
# Writes
# --------------------


def _changes(before: dict[str, Any], after: dict[str, Any]) -> dict[str, list[Any]]:
    return {name: [before.get(name), value] for name, value in after.items() if before.get(name) != value}


def _next_position(conn: database.Connection, storyline_id: int | None) -> int | None:
    if storyline_id is None:
        return None
    row = conn.execute(
        "SELECT coalesce(max(storyline_position), 0) + 1 AS next FROM lore_events WHERE storyline_id = %s",
        (storyline_id,),
    ).fetchone()
    return int(row["next"])


def create(kind: Kind, data: dict[str, Any], actor: Viewer) -> dict:
    values = clean(kind, data, creating=True)
    with database.connect() as conn:
        _check_refs(conn, kind, values)
        merged = {f.name: f.default for f in kind.fields} | values
        if kind.name == "event":
            _check_event(merged)
            merged["storyline_position"] = _next_position(conn, merged.get("storyline_id"))
        columns = list(merged)
        row = conn.execute(
            f"INSERT INTO {kind.table} ({', '.join(columns)}, created_by, updated_by) "
            f"VALUES ({', '.join(['%s'] * len(columns))}, %s, %s) RETURNING *",
            [*merged.values(), actor.user_id, actor.user_id],
        ).fetchone()
        entity_id = row["id"]
        mentions.rebuild(conn, kind.name, entity_id, [merged.get(name) for name in kind.long_text])
        history.record(
            conn,
            kind.name,
            entity_id,
            "created",
            actor,
            {name: [None, value] for name, value in values.items() if value not in (None, "")},
        )
        if kind.name == "event":
            notifications.on_event_change(conn, None, row)
        return _detail(conn, kind, entity_id)


def update(kind: Kind, entity_id: int, data: dict[str, Any], actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    version = data.get("version")
    if isinstance(version, bool) or not isinstance(version, int):
        raise bad("version_required")
    values = clean(kind, data, creating=False)
    with database.connect() as conn:
        before = _locked(conn, kind, entity_id)
        if before["version"] != version:
            raise LoreError(409, "edited_elsewhere", {"current": jsonable_encoder(_detail(conn, kind, entity_id))})
        if before["deleted_at"] is not None:
            raise LoreError(409, "deleted")
        changes = _changes(before, values)
        if not changes:
            return _detail(conn, kind, entity_id)
        _check_refs(conn, kind, {name: values[name] for name in changes})
        updates = {name: values[name] for name in changes}
        if kind.name == "event":
            _check_event(dict(before) | updates)
            if "storyline_id" in updates:
                updates["storyline_position"] = _next_position(conn, updates["storyline_id"])
        assignments = ", ".join(f"{name} = %s" for name in updates)
        after = conn.execute(
            f"UPDATE {kind.table} SET {assignments}, version = version + 1, updated_at = now(), updated_by = %s "
            "WHERE id = %s RETURNING *",
            [*updates.values(), actor.user_id, entity_id],
        ).fetchone()
        if any(name in changes for name in kind.long_text):
            mentions.rebuild(conn, kind.name, entity_id, [after[name] for name in kind.long_text])
        history.record(conn, kind.name, entity_id, "updated", actor, changes)
        if kind.name == "event":
            notifications.on_event_change(conn, before, after)
        return _detail(conn, kind, entity_id)


def delete(kind: Kind, entity_id: int, actor: Viewer) -> dict:
    with database.connect() as conn:
        before = _locked(conn, kind, entity_id)
        if before["deleted_at"] is None:
            after = conn.execute(
                f"UPDATE {kind.table} SET deleted_at = now(), updated_at = now(), updated_by = %s "
                "WHERE id = %s RETURNING *",
                (actor.user_id, entity_id),
            ).fetchone()
            history.record(conn, kind.name, entity_id, "deleted", actor)
            if kind.name == "event":
                notifications.on_event_change(conn, before, after)
        return {"ok": True}


def restore(kind: Kind, entity_id: int, actor: Viewer) -> dict:
    with database.connect() as conn:
        before = _locked(conn, kind, entity_id)
        if before["deleted_at"] is not None:
            after = conn.execute(
                f"UPDATE {kind.table} SET deleted_at = NULL, updated_at = now(), updated_by = %s "
                "WHERE id = %s RETURNING *",
                (actor.user_id, entity_id),
            ).fetchone()
            history.record(conn, kind.name, entity_id, "restored", actor)
            if kind.name == "event":
                notifications.on_event_change(conn, before, after)
        return _detail(conn, kind, entity_id)
