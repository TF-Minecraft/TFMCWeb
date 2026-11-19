"""Links between lore records: relations, affiliations, storyline members and order,
event helpers and characters, and a character's face (a skin upload or a player).

Link lists are replaced whole (`PUT` the full list), which keeps the editors simple and
makes a repeated save harmless. Each change records history on the record it was made on.
"""
from __future__ import annotations

import io
import re
from typing import Any

from PIL import Image

from src import database
from src.characters.wardrobe import skin_face_png

from . import history, notifications
from .entities import KINDS, _detail, _usable, exists, labels, touch
from .errors import LoreError, bad, not_found
from .people import Viewer, roster_ids

RELATION_TYPES = ("ally", "friendly", "neutral", "unfriendly", "hostile", "rival", "family")
RELATION_KINDS = ("character", "organisation")
STORYLINE_MEMBER_KINDS = ("character", "organisation", "location")
MAX_LINKS = 500
MAX_SKIN_BYTES = 64 * 1024
FACE_SIZE = 64
MC_NAME_RE = re.compile(r"^[A-Za-z0-9_]{1,16}$")


def _id(value: Any, code: str) -> int:
    if isinstance(value, bool):
        raise bad(code)
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise bad(code) from None
    if not 0 < number < 2**63:
        raise bad(code)
    return number


def _text(value: Any, max_len: int, code: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str) or len(value) > max_len:
        raise bad(code)
    return value.strip()


def _list(value: Any, code: str = "bad_body") -> list:
    if not isinstance(value, list) or len(value) > MAX_LINKS:
        raise bad(code)
    return value


def _require_live(conn: database.Connection, kind: str, entity_id: int, code: str) -> None:
    if not exists(conn, kind, entity_id):
        raise bad(code)


def _hidden(conn: database.Connection, refs: Any) -> set:
    """The (kind, id) refs whose record is deleted. Editors never see links to deleted
    records, so a whole-list save keeps these instead of dropping them, and restoring the
    record brings its links back."""
    return {ref for ref in refs if not exists(conn, ref[0], ref[1])}


# --------------------
# Relations
# --------------------


def _relation_values(data: Any, *, creating: bool) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise bad("bad_body")
    values: dict[str, Any] = {}
    if creating:
        for side in ("source", "target"):
            kind = data.get(f"{side}_kind")
            if kind not in RELATION_KINDS:
                raise bad(f"bad_{side}_kind")
            values[f"{side}_kind"] = kind
            values[f"{side}_id"] = _id(data.get(f"{side}_id"), f"bad_{side}_id")
        if values["source_kind"] == values["target_kind"] and values["source_id"] == values["target_id"]:
            raise bad("self_relation")
    if creating or "type" in data:
        if data.get("type") not in RELATION_TYPES:
            raise bad("bad_type")
        values["type"] = data["type"]
    if creating or "note" in data:
        values["note"] = _text(data.get("note"), 500, "bad_note")
    return values


def _relation_summary(conn: database.Connection, row: dict) -> dict:
    named = labels(conn, [(row["source_kind"], row["source_id"]), (row["target_kind"], row["target_id"])])
    return {
        "id": row["id"],
        "type": row["type"],
        "note": row["note"],
        "source": named.get((row["source_kind"], row["source_id"])),
        "target": named.get((row["target_kind"], row["target_id"])),
    }


def create_relation(data: Any, actor: Viewer) -> dict:
    values = _relation_values(data, creating=True)
    with database.connect() as conn:
        _usable(conn, KINDS[values["source_kind"]], values["source_id"])
        _require_live(conn, values["target_kind"], values["target_id"], "bad_target_id")
        row = conn.execute(
            "INSERT INTO lore_relations (source_kind, source_id, target_kind, target_id, type, note) "
            "VALUES (%(source_kind)s, %(source_id)s, %(target_kind)s, %(target_id)s, %(type)s, %(note)s) "
            "ON CONFLICT (source_kind, source_id, target_kind, target_id) DO NOTHING RETURNING *",
            values,
        ).fetchone()
        if row is None:
            raise LoreError(409, "relation_exists")
        summary = _relation_summary(conn, row)
        history.record(conn, row["source_kind"], row["source_id"], "relation_added", actor, {"relation": summary})
        touch(conn, KINDS[row["source_kind"]], row["source_id"], actor)
        return summary


def _relation(conn: database.Connection, relation_id: int) -> dict:
    row = conn.execute("SELECT * FROM lore_relations WHERE id = %s FOR UPDATE", (relation_id,)).fetchone()
    if row is None:
        raise not_found()
    return row


def update_relation(relation_id: int, data: Any, actor: Viewer) -> dict:
    values = _relation_values(data, creating=False)
    with database.connect() as conn:
        before = _relation(conn, relation_id)
        changes = {name: [before[name], value] for name, value in values.items() if before[name] != value}
        if not changes:
            return _relation_summary(conn, before)
        row = conn.execute(
            "UPDATE lore_relations SET " + ", ".join(f"{name} = %({name})s" for name in values)
            + " WHERE id = %(id)s RETURNING *",
            values | {"id": relation_id},
        ).fetchone()
        summary = _relation_summary(conn, row)
        history.record(
            conn, row["source_kind"], row["source_id"], "relation_changed", actor, {"relation": summary, **changes}
        )
        touch(conn, KINDS[row["source_kind"]], row["source_id"], actor)
        return summary


def delete_relation(relation_id: int, actor: Viewer) -> dict:
    with database.connect() as conn:
        row = _relation(conn, relation_id)
        summary = _relation_summary(conn, row)
        conn.execute("DELETE FROM lore_relations WHERE id = %s", (relation_id,))
        history.record(conn, row["source_kind"], row["source_id"], "relation_removed", actor, {"relation": summary})
        touch(conn, KINDS[row["source_kind"]], row["source_id"], actor)
    return {"ok": True}


# --------------------
# Affiliations (character <-> organisation, with a role)
# --------------------


def _affiliation_list(data: Any, key: str) -> dict[int, str]:
    if not isinstance(data, dict):
        raise bad("bad_body")
    wanted: dict[int, str] = {}
    for item in _list(data.get(key)):
        if not isinstance(item, dict):
            raise bad("bad_body")
        id_key = "organisation_id" if key == "affiliations" else "character_id"
        wanted[_id(item.get(id_key), f"bad_{id_key}")] = _text(item.get("role"), 80, "bad_role")
    return wanted


def _replace_affiliations(
    conn: database.Connection, kind: str, entity_id: int, wanted: dict[int, str], actor: Viewer
) -> None:
    own, other, other_kind = (
        ("character_id", "organisation_id", "organisation")
        if kind == "character"
        else ("organisation_id", "character_id", "character")
    )
    for other_id in wanted:
        _require_live(conn, other_kind, other_id, f"bad_{other}")
    rows = conn.execute(
        f"SELECT {other} AS other_id, role FROM lore_character_affiliations WHERE {own} = %s", (entity_id,)
    ).fetchall()
    stored = {row["other_id"]: row["role"] for row in rows}
    hidden = {i for _, i in _hidden(conn, [(other_kind, i) for i in stored])}
    before = {i: role for i, role in stored.items() if i not in hidden}
    if before == wanted:
        return
    conn.execute(f"DELETE FROM lore_character_affiliations WHERE {own} = %s", (entity_id,))
    keep = {**{i: stored[i] for i in hidden}, **wanted}
    if keep:
        with conn.cursor() as cur:
            cur.executemany(
                f"INSERT INTO lore_character_affiliations ({own}, {other}, role) VALUES (%s, %s, %s)",
                [(entity_id, other_id, role) for other_id, role in keep.items()],
            )
    named = labels(conn, [(other_kind, i) for i in {*before, *wanted}])

    def label(i: int) -> str:
        return (named.get((other_kind, i)) or {}).get("label") or f"#{i}"

    changes = {
        "added": [{"id": i, "label": label(i), "role": wanted[i]} for i in wanted if i not in before],
        "removed": [{"id": i, "label": label(i)} for i in before if i not in wanted],
        "role_changed": [
            {"id": i, "label": label(i), "role": [before[i], wanted[i]]}
            for i in wanted
            if i in before and before[i] != wanted[i]
        ],
    }
    action = "affiliations_changed" if kind == "character" else "members_changed"
    history.record(conn, kind, entity_id, action, actor, {k: v for k, v in changes.items() if v})
    touch(conn, KINDS[kind], entity_id, actor)


def set_affiliations(character_id: int, data: Any, actor: Viewer) -> dict:
    wanted = _affiliation_list(data, "affiliations")
    with database.connect() as conn:
        _usable(conn, KINDS["character"], character_id)
        _replace_affiliations(conn, "character", character_id, wanted, actor)
        return _detail(conn, KINDS["character"], character_id)


def set_organisation_members(organisation_id: int, data: Any, actor: Viewer) -> dict:
    wanted = _affiliation_list(data, "members")
    with database.connect() as conn:
        _usable(conn, KINDS["organisation"], organisation_id)
        _replace_affiliations(conn, "organisation", organisation_id, wanted, actor)
        return _detail(conn, KINDS["organisation"], organisation_id)


# --------------------
# Storylines
# --------------------


def set_storyline_members(storyline_id: int, data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    wanted: list[tuple[str, int]] = []
    for item in _list(data.get("members")):
        if not isinstance(item, dict) or item.get("kind") not in STORYLINE_MEMBER_KINDS:
            raise bad("bad_member")
        ref = (item["kind"], _id(item.get("id"), "bad_member"))
        if ref not in wanted:
            wanted.append(ref)
    with database.connect() as conn:
        _usable(conn, KINDS["storyline"], storyline_id)
        for kind, ref_id in wanted:
            _require_live(conn, kind, ref_id, "bad_member")
        rows = conn.execute(
            "SELECT kind, ref_id FROM lore_storyline_members WHERE storyline_id = %s", (storyline_id,)
        ).fetchall()
        stored = {(row["kind"], row["ref_id"]) for row in rows}
        hidden = _hidden(conn, stored)
        before = stored - hidden
        after = set(wanted)
        if before != after:
            conn.execute("DELETE FROM lore_storyline_members WHERE storyline_id = %s", (storyline_id,))
            keep = wanted + sorted(hidden)
            if keep:
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO lore_storyline_members (storyline_id, kind, ref_id) VALUES (%s, %s, %s)",
                        [(storyline_id, kind, ref_id) for kind, ref_id in keep],
                    )
            named = labels(conn, list(before | after))

            def shown(ref: tuple[str, int]) -> dict:
                return {"kind": ref[0], "id": ref[1], "label": (named.get(ref) or {}).get("label")}

            changes = {
                "added": [shown(ref) for ref in wanted if ref not in before],
                "removed": [shown(ref) for ref in sorted(before - after)],
            }
            history.record(
                conn, "storyline", storyline_id, "members_changed", actor, {k: v for k, v in changes.items() if v}
            )
            touch(conn, KINDS["storyline"], storyline_id, actor)
        return _detail(conn, KINDS["storyline"], storyline_id)


def set_storyline_order(storyline_id: int, data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    order = [_id(value, "bad_order") for value in _list(data.get("event_ids"), "bad_order")]
    with database.connect() as conn:
        _usable(conn, KINDS["storyline"], storyline_id)
        rows = conn.execute(
            "SELECT id FROM lore_events WHERE storyline_id = %s AND deleted_at IS NULL "
            "ORDER BY storyline_position NULLS LAST, scheduled_on NULLS LAST, id FOR UPDATE",
            (storyline_id,),
        ).fetchall()
        current = [row["id"] for row in rows]
        if len(order) != len(set(order)) or set(order) != set(current):
            raise bad("bad_order")
        if order != current:
            with conn.cursor() as cur:
                cur.executemany(
                    "UPDATE lore_events SET storyline_position = %s WHERE id = %s",
                    [(position, event_id) for position, event_id in enumerate(order, start=1)],
                )
            history.record(conn, "storyline", storyline_id, "events_reordered", actor, {"event_ids": [current, order]})
            touch(conn, KINDS["storyline"], storyline_id, actor)
        return _detail(conn, KINDS["storyline"], storyline_id)


# --------------------
# Events
# --------------------


def set_event_helpers(event_id: int, data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    wanted = {_id(value, "bad_user_id") for value in _list(data.get("user_ids"))}
    with database.connect() as conn:
        event = _usable(conn, KINDS["event"], event_id)
        rows = conn.execute("SELECT user_id FROM lore_event_helpers WHERE event_id = %s", (event_id,)).fetchall()
        before = {row["user_id"] for row in rows}
        # Helpers who later left the roster may stay; new ones must be on it.
        if wanted - before - roster_ids(conn):
            raise bad("not_on_roster")
        if wanted != before:
            removed, added = before - wanted, wanted - before
            if removed:
                conn.execute(
                    "DELETE FROM lore_event_helpers WHERE event_id = %s AND user_id = ANY(%s)",
                    (event_id, sorted(removed)),
                )
            if added:
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO lore_event_helpers (event_id, user_id) VALUES (%s, %s)",
                        [(event_id, user_id) for user_id in sorted(added)],
                    )
            history.record(
                conn,
                "event",
                event_id,
                "helpers_changed",
                actor,
                {k: v for k, v in {"added": sorted(added), "removed": sorted(removed)}.items() if v},
            )
            touch(conn, KINDS["event"], event_id, actor)
            notifications.on_helpers_added(conn, event, added)
        return _detail(conn, KINDS["event"], event_id)


def set_event_characters(event_id: int, data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict):
        raise bad("bad_body")
    wanted = {_id(value, "bad_character_id") for value in _list(data.get("character_ids"))}
    with database.connect() as conn:
        _usable(conn, KINDS["event"], event_id)
        for character_id in wanted:
            _require_live(conn, "character", character_id, "bad_character_id")
        rows = conn.execute(
            "SELECT character_id FROM lore_event_characters WHERE event_id = %s", (event_id,)
        ).fetchall()
        stored = {row["character_id"] for row in rows}
        hidden = {i for _, i in _hidden(conn, [("character", i) for i in stored])}
        before = stored - hidden
        if wanted != before:
            conn.execute("DELETE FROM lore_event_characters WHERE event_id = %s", (event_id,))
            keep = wanted | hidden
            if keep:
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO lore_event_characters (event_id, character_id) VALUES (%s, %s)",
                        [(event_id, character_id) for character_id in sorted(keep)],
                    )
            named = labels(conn, [("character", i) for i in before | wanted])

            def shown(i: int) -> dict:
                return {"id": i, "label": (named.get(("character", i)) or {}).get("label")}

            changes = {
                "added": [shown(i) for i in sorted(wanted - before)],
                "removed": [shown(i) for i in sorted(before - wanted)],
            }
            history.record(
                conn, "event", event_id, "characters_changed", actor, {k: v for k, v in changes.items() if v}
            )
            touch(conn, KINDS["event"], event_id, actor)
        return _detail(conn, KINDS["event"], event_id)


# --------------------
# Character faces
# --------------------


def set_skin(character_id: int, skin_png: bytes, actor: Viewer) -> dict:
    if not skin_png or len(skin_png) > MAX_SKIN_BYTES:
        raise bad("bad_skin")
    # Read the header before decoding, so a tiny file declaring a huge image is refused cheaply.
    try:
        with Image.open(io.BytesIO(skin_png)) as probe:
            if probe.format != "PNG" or probe.width != 64 or probe.height not in (32, 64):
                raise bad("bad_skin")
    except LoreError:
        raise
    except Exception:
        raise bad("bad_skin") from None
    face = skin_face_png(skin_png)
    if face is None:
        raise bad("bad_skin")
    with database.connect() as conn:
        _usable(conn, KINDS["character"], character_id)
        conn.execute("UPDATE lore_characters SET face_png = %s WHERE id = %s", (face, character_id))
        history.record(conn, "character", character_id, "face_uploaded", actor)
        touch(conn, KINDS["character"], character_id, actor)
        return _detail(conn, KINDS["character"], character_id)


def clear_skin(character_id: int, actor: Viewer) -> dict:
    with database.connect() as conn:
        row = _usable(conn, KINDS["character"], character_id)
        if row["face_png"] is not None:
            conn.execute("UPDATE lore_characters SET face_png = NULL WHERE id = %s", (character_id,))
            history.record(conn, "character", character_id, "face_removed", actor)
            touch(conn, KINDS["character"], character_id, actor)
        return _detail(conn, KINDS["character"], character_id)


def _resolve_player(conn: database.Connection, name: str) -> tuple[str, str] | None:
    """A Minecraft name to (uuid, name): linked accounts first (they keep the name's case), then LuckPerms."""
    row = conn.execute(
        "SELECT player_uuid AS uuid, minecraft_name AS name FROM discord_links "
        "WHERE lower(minecraft_name) = lower(%s) ORDER BY linked_at DESC LIMIT 1",
        (name,),
    ).fetchone()
    if row is None:
        row = conn.execute(
            "SELECT uuid, name FROM lp_users WHERE lower(name) = lower(%s) ORDER BY uuid LIMIT 1", (name,)
        ).fetchone()
    if row is None or not row["uuid"]:
        return None
    return row["uuid"], row["name"] or name


def set_player(character_id: int, data: Any, actor: Viewer) -> dict:
    if not isinstance(data, dict) or "name" not in data:
        raise bad("bad_body")
    name = data.get("name")
    if name is not None and (not isinstance(name, str) or not MC_NAME_RE.match(name.strip())):
        raise bad("bad_player")
    with database.connect() as conn:
        row = _usable(conn, KINDS["character"], character_id)
        if name is None:
            uuid, player_name = None, None
        else:
            found = _resolve_player(conn, name.strip())
            if found is None:
                raise bad("unknown_player")
            uuid, player_name = found
        if (row["player_uuid"], row["player_name"]) != (uuid, player_name):
            conn.execute(
                "UPDATE lore_characters SET player_uuid = %s, player_name = %s WHERE id = %s",
                (uuid, player_name, character_id),
            )
            history.record(
                conn, "character", character_id, "player_changed", actor, {"player": [row["player_name"], player_name]}
            )
            touch(conn, KINDS["character"], character_id, actor)
        return _detail(conn, KINDS["character"], character_id)


def _upscale(face_png: bytes) -> bytes | None:
    try:
        image = Image.open(io.BytesIO(face_png)).convert("RGBA")
    except Exception:
        return None
    buf = io.BytesIO()
    image.resize((FACE_SIZE, FACE_SIZE), Image.Resampling.NEAREST).save(buf, format="PNG")
    return buf.getvalue()


def face(character_id: int) -> bytes | None:
    """The character's face as a 64x64 PNG: the uploaded skin's face, else its player's head."""
    from src.auth import account_overview

    with database.connect() as conn:
        row = conn.execute(
            "SELECT face_png, player_uuid FROM lore_characters WHERE id = %s AND deleted_at IS NULL",
            (character_id,),
        ).fetchone()
    if row is None:
        return None
    if row["face_png"] is not None:
        return _upscale(bytes(row["face_png"]))
    if row["player_uuid"]:
        return account_overview.head(row["player_uuid"])
    return None
