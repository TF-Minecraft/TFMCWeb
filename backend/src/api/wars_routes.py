"""War declare code API: staff mint in Discord, SimpleFactions validates and redeems."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

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
