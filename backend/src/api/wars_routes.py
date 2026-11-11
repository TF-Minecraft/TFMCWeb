"""War declare code API: staff mint in Discord, SimpleFactions validates and redeems."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from src.api.request_body import read_json_body

from src.skins.auth import (
    AuthError,
    HEADER_PLUGIN_KEY,
    HEADER_STAFF_KEY,
    require_plugin_key,
    require_staff_key,
)
from src.wars.declare_codes import (
    DECLARABLE_GOALS,
    WarDeclareCodeError,
    list_outstanding,
    mint,
    redeem,
    revoke,
    validate,
)
from src.skins.codes import CodeError, normalize_realm_id
from src.skins.discord_link import get_link_for_discord_id
from src.wars import actions as war_actions
from src.wars import notifications as war_notifications
from src.wars.history_model import WAR_KEY_RE
from src.wars.history_ingest import (
    MAX_BODY_BYTES as WAR_HISTORY_MAX_BODY_BYTES,
    WarHistoryRequestError,
    ingest_battles,
    ingest_events,
)

logger = logging.getLogger("wars.routes")

wars_router = APIRouter(prefix="/wars", tags=["wars"])


class MintCodeBody(BaseModel):
    # For kind "coalition_offensive": the coalition leader faction and its target.
    attacker_faction_id: str = Field(..., min_length=1)
    defender_faction_id: str = Field(..., min_length=1)
    # "war_declare" (default) or "coalition_offensive".
    kind: str | None = None
    # Optional for war_declare (the leader picks goals in game); refused for coalition codes.
    goal: str | None = None
    realm_id: str | None = None
    created_by_discord_id: str | None = None
    ttl_hours: int | None = None


class ValidateCodeBody(BaseModel):
    code: str = Field(..., min_length=1)
    attacker_faction_id: str = Field(..., min_length=1)
    defender_faction_id: str = Field(..., min_length=1)
    realm_id: str | None = None
    kind: str | None = None


class RedeemCodeBody(BaseModel):
    code: str = Field(..., min_length=1)
    attacker_faction_id: str = Field(..., min_length=1)
    defender_faction_id: str = Field(..., min_length=1)
    realm_id: str | None = None
    war_id: str | None = None
    kind: str | None = None


class NotificationAckBody(BaseModel):
    ids: list[int] = Field(default_factory=list, max_length=1000)


class ActionResultsBody(BaseModel):
    results: list = Field(default_factory=list)
    # Optional: SimpleFactions' realm, so a result can only touch that realm's rows.
    realm_id: str | None = None


class StaffActionBody(BaseModel):
    realm: str | None = None
    discord_user_id: str = Field(..., min_length=1, max_length=32)
    war_key: str = Field(..., min_length=1, max_length=64)
    kind: str
    payload: dict = Field(default_factory=dict)


class StaffMuteBody(BaseModel):
    realm: str | None = None
    war_key: str = Field(..., min_length=1, max_length=64)
    discord_user_id: str = Field(..., min_length=1, max_length=32)


class RevokeCodeBody(BaseModel):
    id: int
    realm_id: str | None = None


def _require_plugin(x_plugin_key: str | None) -> None:
    try:
        require_plugin_key(x_plugin_key)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


def _require_staff(x_staff_key: str | None) -> None:
    try:
        require_staff_key(x_staff_key)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


@wars_router.get("/declare-codes/goals")
def get_declarable_goals(
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """The goals a war_declare code may carry. Kept for older bots; codes no longer need a goal."""
    _require_staff(x_staff_key)
    return {"goals": list(DECLARABLE_GOALS)}


@wars_router.post("/declare-codes")
def post_declare_code(
    body: MintCodeBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """Staff mint. The plaintext code is in this response and nowhere else."""
    _require_staff(x_staff_key)
    try:
        return mint(
            body.attacker_faction_id,
            body.defender_faction_id,
            body.goal,
            realm_id=body.realm_id,
            created_by_discord_id=body.created_by_discord_id,
            ttl_hours=body.ttl_hours,
            kind=body.kind,
        )
    except (WarDeclareCodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@wars_router.post("/declare-codes/validate")
def post_validate_declare_code(
    body: ValidateCodeBody,
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """Non-consuming. The plugin calls this before it opens the goal picker or offensive."""
    _require_plugin(x_plugin_key)
    try:
        return validate(
            body.code,
            body.attacker_faction_id,
            body.defender_faction_id,
            realm_id=body.realm_id,
            kind=body.kind,
        )
    except (WarDeclareCodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@wars_router.post("/declare-codes/redeem")
def post_redeem_declare_code(
    body: RedeemCodeBody,
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """Consuming. The plugin calls this only once the war or coalition offensive exists."""
    _require_plugin(x_plugin_key)
    try:
        return redeem(
            body.code,
            body.attacker_faction_id,
            body.defender_faction_id,
            realm_id=body.realm_id,
            war_id=body.war_id,
            kind=body.kind,
        )
    except (WarDeclareCodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@wars_router.get("/declare-codes")
def get_declare_codes(
    realm_id: str | None = None,
    limit: int | None = None,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """Outstanding codes for staff. Ids and metadata only, never a code."""
    _require_staff(x_staff_key)
    try:
        return {"codes": list_outstanding(realm_id=realm_id, limit=limit)}
    except (WarDeclareCodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@wars_router.post("/declare-codes/revoke")
def post_revoke_declare_code(
    body: RevokeCodeBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """Staff revoke by id, which is the only handle they keep after mint."""
    _require_staff(x_staff_key)
    try:
        return revoke(body.id, realm_id=body.realm_id)
    except (WarDeclareCodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# --- War history (SimpleFactions outbox) ----------------------------------------
# Contract: docs/docs/map/war-history.md. Idempotent: a stored id is acked again.


async def _ingest(request: Request, x_plugin_key: str | None, ingest) -> dict:
    _require_plugin(x_plugin_key)
    body = await read_json_body(request, WAR_HISTORY_MAX_BODY_BYTES)
    try:
        return await run_in_threadpool(ingest, body)
    except WarHistoryRequestError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@wars_router.post("/plugin/events")
async def post_war_events(
    request: Request,
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """`{"realm_id", "events": [...]}` -> `{"acked": [ids], "rejected"?: [{id, reason}]}`."""
    return await _ingest(request, x_plugin_key, ingest_events)


@wars_router.post("/plugin/battles")
async def post_war_battles(
    request: Request,
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """`{"realm_id", "records": [...]}` -> `{"acked": [ids], "rejected"?: [{id, reason}]}`."""
    return await _ingest(request, x_plugin_key, ingest_battles)


# --- War notifications (the Discord bot's outbox) -------------------------------
# Contract v1.2: docs/docs/map/war-history.md#discord-notifications.


@wars_router.get("/staff/notifications")
def get_war_notifications(
    limit: int = Query(default=war_notifications.DEFAULT_LIMIT, ge=1, le=war_notifications.MAX_LIMIT),
    realm: list[str] | None = Query(default=None),
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """Undelivered notifications, oldest first; each is offered again 10 minutes after it was handed out.

    `outbox_id` names this database's outbox, so the bot can tell a reset database from this one.
    """
    _require_staff(x_staff_key)
    return {"outbox_id": war_notifications.outbox_id(), "notifications": war_notifications.pending(limit, realm)}


@wars_router.post("/staff/notifications/ack")
def post_war_notifications_ack(
    body: NotificationAckBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """`{"ids": [...]}` -> `{"acked": [ids that exist]}`."""
    _require_staff(x_staff_key)
    return {"acked": war_notifications.ack(body.ids)}


@wars_router.post("/staff/mutes")
def post_war_dm_mute(
    body: StaffMuteBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """The bot's "Mute this war" button (contract v1.4): no more availability reminder DMs of that war
    for that Discord user. `{"muted": true, "new": bool}`; muting again is fine."""
    _require_staff(x_staff_key)
    realm = _action_realm(body.realm)
    if not WAR_KEY_RE.match(body.war_key):
        raise HTTPException(status_code=404, detail="War not found")
    user_id = body.discord_user_id.strip()
    if not user_id.isdigit():
        raise HTTPException(status_code=400, detail="discord_user_id must be a Discord user id")
    return {"muted": True, "new": war_notifications.mute(realm, body.war_key, user_id)}


# --- War actions (votes and call to arms answers from the website and Discord) ---------
# Contract v1.3: docs/docs/map/war-history.md#war-actions.


def _action_realm(value: str | None) -> str:
    try:
        return normalize_realm_id(value)
    except CodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


def _action_error(e: war_actions.WarActionError) -> HTTPException:
    return HTTPException(status_code=e.status, detail=str(e))


@wars_router.get("/plugin/actions/pending")
def get_pending_war_actions(
    realm: str | None = Query(default=None),
    limit: int = Query(default=war_actions.DEFAULT_LIMIT, ge=1, le=war_actions.MAX_LIMIT),
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """Pending actions of the realm, oldest first, stamped as delivered: `{"actions": [...]}`."""
    _require_plugin(x_plugin_key)
    return {"actions": war_actions.pending(_action_realm(realm), limit)}


@wars_router.post("/plugin/actions/applied")
def post_war_actions_applied(
    body: ActionResultsBody,
    x_plugin_key: str | None = Header(default=None, alias=HEADER_PLUGIN_KEY),
):
    """`{"results": [{"id", "status": "applied"|"rejected", "reason"}]}` -> `{"acked": [ids]}`."""
    _require_plugin(x_plugin_key)
    realm = _action_realm(body.realm_id) if body.realm_id is not None else None
    try:
        return war_actions.record_results(realm, body.results)
    except war_actions.WarActionError as e:
        raise _action_error(e) from e


@wars_router.post("/staff/actions")
def post_staff_war_action(
    body: StaffActionBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """The bot queues a Discord user's call to arms answer: `{"id", "status": "pending"}`.

    409 `discord_not_linked` when the Discord user has no linked Minecraft account.
    """
    _require_staff(x_staff_key)
    realm = _action_realm(body.realm)
    if body.kind != "call_to_arms_answer":
        raise HTTPException(status_code=400, detail="kind must be call_to_arms_answer")
    if not WAR_KEY_RE.match(body.war_key):
        raise HTTPException(status_code=404, detail="War not found")
    link = get_link_for_discord_id(body.discord_user_id)
    account = war_actions.account_key(link["player_uuid"]) if link else None
    if account is None:
        raise HTTPException(status_code=409, detail="discord_not_linked")
    try:
        action = war_actions.queue_call_answer(
            realm, body.war_key, account, body.payload, source="discord",
            discord_user_id=body.discord_user_id.strip(), require_open_call=False,
        )
    except war_actions.WarActionError as e:
        raise _action_error(e) from e
    return {"id": action["id"], "status": action["status"]}


@wars_router.get("/staff/actions/{action_id}")
def get_staff_war_action(
    action_id: int,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """One action's `status` (`pending`, `applied`, `rejected`, `expired`) and `reason`."""
    _require_staff(x_staff_key)
    found = war_actions.status(action_id)
    if found is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return found
