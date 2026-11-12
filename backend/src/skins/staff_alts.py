"""Staff alt links: more Minecraft accounts a staff member plays on, tied to their own Discord link.

One Discord account still links one Minecraft account (discord_links). A staff member
(site role mod or above) whose own Minecraft account is linked may add up to MAX_ALTS
more by pasting a /linkdiscord code from each alt into their Account page; only someone
who can log into the alt can get that code. Linked alts can mint /token codes and open
Profile (wardrobe, skins, drinks) like the owner's own account.

An alt counts as linked (src/skins/discord_link.py get_identity_status) only while its
owner's Discord link stands and the owner is still staff. The row stays when that stops,
so the alt works again if they return; the owner or an admin removes it for good. A ban
of the owner's account is copied to the alts (src/skins/moderation.py).
"""

from __future__ import annotations

from src import database
from src.auth import audit, roles

from .codes import api_time
from .discord_link import (
    LinkError,
    _code_candidate,
    _code_hash,
    _link_write,
    _refuse_code,
    _spend_code,
    _utcnow,
)
from .plugin_notices import enqueue_link_success

MAX_ALTS = 3


class StaffAltRefused(LinkError):
    """A refused removal: an HTTP status and a stable code for the staff tools."""

    def __init__(self, status: int, code: str):
        super().__init__(code)
        self.status = status
        self.code = code


def _owner(conn, discord_id: str):
    """The Discord account's own link and site role, or None without a link."""
    return conn.execute(
        """
        SELECT dl.player_uuid, dl.minecraft_name, dl.discord_username, u.role
        FROM discord_links dl
        LEFT JOIN users u ON u.discord_user_id = dl.discord_user_id AND NOT u.placeholder
        WHERE dl.discord_user_id = %s
        """,
        (discord_id,),
    ).fetchone()


def _banned(conn, player_uuid: str) -> bool:
    row = conn.execute(
        "SELECT banned, expires_at FROM player_bans WHERE lower(player_uuid) = lower(%s)", (player_uuid,)
    ).fetchone()
    return bool(row and row["banned"] and (row["expires_at"] is None or row["expires_at"] > _utcnow()))


def _check(conn, discord_id: str, alt_uuid: str):
    """The owner's link when this Discord account may add the alt; raise why not."""
    owner = _owner(conn, discord_id)
    if owner is None:
        raise LinkError("Link your own Minecraft account before adding a staff alt")
    if not roles.is_staff(owner["role"]):
        raise LinkError("Only staff can link staff alts")
    if str(owner["player_uuid"]).lower() == alt_uuid:
        raise LinkError("That is your own linked Minecraft account")
    if conn.execute(
        "SELECT 1 FROM discord_links WHERE lower(player_uuid) = %s", (alt_uuid,)
    ).fetchone() is not None:
        raise LinkError("This Minecraft account is already linked to a Discord account")
    existing = conn.execute(
        "SELECT discord_user_id FROM staff_alt_links WHERE player_uuid = %s", (alt_uuid,)
    ).fetchone()
    if existing is not None:
        if existing["discord_user_id"] == discord_id:
            raise LinkError("This Minecraft account is already one of your staff alts")
        raise LinkError("This Minecraft account is a staff alt of a Discord account")
    count = conn.execute(
        "SELECT count(*) AS n FROM staff_alt_links WHERE discord_user_id = %s", (discord_id,)
    ).fetchone()["n"]
    if count >= MAX_ALTS:
        raise LinkError(f"You can link up to {MAX_ALTS} staff alts")
    if _banned(conn, owner["player_uuid"]):
        raise LinkError("Your linked Minecraft account is banned")
    return owner


def preview(code: str, discord_user_id: str) -> dict:
    """Name the account a code would add as a staff alt, without using the code."""
    discord_id = (discord_user_id or "").strip()
    with database.connect() as conn:
        row = conn.execute(
            "SELECT * FROM discord_link_codes WHERE code_hash = %s", (_code_hash(code),)
        ).fetchone()
        _refuse_code(row, _utcnow())
        _check(conn, discord_id, str(row["player_uuid"]).lower())
    return {
        "player_uuid": str(row["player_uuid"]).lower(),
        "minecraft_name": row["minecraft_name"],
        "expires_at": api_time(row["expires_at"]),
    }


def link(code: str, actor: dict) -> dict:
    """Add the code's account as a staff alt of the signed-in actor; audited.

    Spends the code like a Discord link does, under the same player lock, so a normal
    link and an alt link of one account never both succeed.
    """
    discord_id = str(actor.get("discord_user_id") or "").strip()
    if not discord_id:
        raise LinkError("discord_user_id is required")
    code_hash = _code_hash(code)
    candidate = _code_candidate(code_hash)
    with _link_write(discord_id, candidate) as conn:
        row = _spend_code(conn, code_hash)
        alt_uuid = str(row["player_uuid"]).lower()
        owner = _check(conn, discord_id, alt_uuid)
        now = _utcnow()
        conn.execute(
            "INSERT INTO staff_alt_links (player_uuid, discord_user_id, minecraft_name, linked_at) "
            "VALUES (%s, %s, %s, %s)",
            (alt_uuid, discord_id, row["minecraft_name"], now),
        )
        # Like a link: older codes for the alt are spent, and the alt hears it is linked.
        conn.execute(
            "UPDATE discord_link_codes SET used_at = %s WHERE lower(player_uuid) = %s AND used_at IS NULL",
            (now, alt_uuid),
        )
        enqueue_link_success(alt_uuid, discord_username=owner["discord_username"], conn=conn)
        audit.record(conn, actor=actor, action="account.staff_alt.link", outcome="ok",
                     detail={"player_uuid": alt_uuid, "minecraft_name": row["minecraft_name"]})
        if row["expires_at"] < _utcnow():
            raise LinkError("Link code has expired")
    return {"player_uuid": alt_uuid, "minecraft_name": row["minecraft_name"], "linked_at": api_time(now)}


def unlink(player_uuid: str, actor: dict, *, any_owner: bool = False) -> dict:
    """Remove a staff alt: the actor's own, or with any_owner (admins) anyone's whose owner
    they outrank, as for other staff actions on accounts; audited.

    Raises StaffAltRefused 404 staff_alt_not_found, or 403 target_outranks_you.
    """
    uuid = (player_uuid or "").strip().lower()
    with database.connect() as conn:
        row = conn.execute(
            "SELECT discord_user_id FROM staff_alt_links WHERE player_uuid = %s", (uuid,)
        ).fetchone()
    mine = row is not None and row["discord_user_id"] == actor.get("discord_user_id")
    if row is None or not (mine or any_owner):
        raise StaffAltRefused(404, "staff_alt_not_found")
    owner_id = row["discord_user_id"]
    with _link_write(owner_id, uuid) as conn:
        owner = conn.execute(
            "SELECT id AS user_id, discord_user_id, discord_username, discord_global_name, role FROM users "
            "WHERE discord_user_id = %s AND NOT placeholder",
            (owner_id,),
        ).fetchone()
        if not mine and owner is not None and not roles.outranks(actor.get("role"), owner["role"]):
            raise StaffAltRefused(403, "target_outranks_you")
        removed = conn.execute(
            "DELETE FROM staff_alt_links WHERE player_uuid = %s AND discord_user_id = %s "
            "RETURNING minecraft_name",
            (uuid, owner_id),
        ).fetchone()
        if removed is None:
            raise StaffAltRefused(404, "staff_alt_not_found")
        audit.record(
            conn, actor=actor,
            action="account.staff_alt.unlink" if mine else "account.staff_alt.remove", outcome="ok",
            target=dict(owner) if owner is not None else {"discord_user_id": owner_id},
            detail={"player_uuid": uuid, "minecraft_name": removed["minecraft_name"]},
        )
    return {"ok": True, "player_uuid": uuid}


def _alt_json(row) -> dict:
    return {
        "player_uuid": row["player_uuid"],
        "minecraft_name": row["minecraft_name"],
        "linked_at": api_time(row["linked_at"]),
    }


def account_view(user: dict) -> dict | None:
    """What the Account page shows: staff, or anyone who still has alts, may see them.

    active says whether the alts count as linked now (own link and staff role).
    """
    discord_id = user["discord_user_id"]
    with database.connect() as conn:
        alts = conn.execute(
            "SELECT player_uuid, minecraft_name, linked_at FROM staff_alt_links "
            "WHERE discord_user_id = %s ORDER BY linked_at, player_uuid",
            (discord_id,),
        ).fetchall()
        linked = conn.execute(
            "SELECT 1 FROM discord_links WHERE discord_user_id = %s", (discord_id,)
        ).fetchone() is not None
    staff = roles.is_staff(user.get("role"))
    if not staff and not alts:
        return None
    return {
        "alts": [_alt_json(row) for row in alts],
        "max": MAX_ALTS,
        "active": staff and linked,
    }


def owns(user: dict, player_uuid: str) -> bool:
    """Whether the account is one of this user's staff alts."""
    with database.connect() as conn:
        return conn.execute(
            "SELECT 1 FROM staff_alt_links WHERE player_uuid = lower(%s) AND discord_user_id = %s",
            ((player_uuid or "").strip(), user["discord_user_id"]),
        ).fetchone() is not None


def for_player(player_uuid: str) -> dict:
    """For staff tools: whose alt this account is, and the alts of this account's Discord link."""
    uuid = (player_uuid or "").strip().lower()
    with database.connect() as conn:
        owner = conn.execute(
            """
            SELECT a.discord_user_id, a.linked_at, dl.player_uuid, dl.minecraft_name
            FROM staff_alt_links a
            LEFT JOIN discord_links dl ON dl.discord_user_id = a.discord_user_id
            WHERE a.player_uuid = %s
            """,
            (uuid,),
        ).fetchone()
        alts = conn.execute(
            """
            SELECT a.player_uuid, a.minecraft_name, a.linked_at
            FROM discord_links dl JOIN staff_alt_links a ON a.discord_user_id = dl.discord_user_id
            WHERE lower(dl.player_uuid) = %s
            ORDER BY a.linked_at, a.player_uuid
            """,
            (uuid,),
        ).fetchall()
    return {
        "staff_alt_of": None if owner is None else {
            "discord_user_id": owner["discord_user_id"],
            "player_uuid": owner["player_uuid"],
            "minecraft_name": owner["minecraft_name"],
            "linked_at": api_time(owner["linked_at"]),
        },
        "staff_alts": [_alt_json(row) for row in alts],
    }


def alts_of(conn, owner_uuid: str) -> list:
    """The alts of the Discord account linked to this player, on the caller's connection."""
    return conn.execute(
        """
        SELECT a.player_uuid, a.minecraft_name, dl.minecraft_name AS owner_name
        FROM discord_links dl JOIN staff_alt_links a ON a.discord_user_id = dl.discord_user_id
        WHERE lower(dl.player_uuid) = lower(%s)
        ORDER BY a.player_uuid
        """,
        (owner_uuid,),
    ).fetchall()
