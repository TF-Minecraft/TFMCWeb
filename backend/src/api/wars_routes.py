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
from src.wars import notifications as war_notifications
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
    """Undelivered notifications, oldest first; each is offered again 10 minutes after it was handed out."""
    _require_staff(x_staff_key)
    return {"notifications": war_notifications.pending(limit, realm)}


@wars_router.post("/staff/notifications/ack")
def post_war_notifications_ack(
    body: NotificationAckBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """`{"ids": [...]}` -> `{"acked": [ids that exist]}`."""
    _require_staff(x_staff_key)
    return {"acked": war_notifications.ack(body.ids)}
