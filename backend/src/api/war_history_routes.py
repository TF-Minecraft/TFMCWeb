"""Public war history reads: the war list, a war's page and a battle's report.
And the signed-in player's side of a war page (contract v1.3): `/me`, votes and
call to arms answers, made with the site's Discord session; v1.4 adds battle
availability (`/availability`).

Gated by the map's access rules, like every other map read; the realm comes
from the map registry. Plain `def` handlers, so FastAPI runs the synchronous
database reads in its threadpool. Shapes: docs/docs/map/war-history.md and
`frontend/lib/wars/types.ts`.
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel

from src.api import auth_routes
from src.api.map_access import ensure_map_access
from src.auth import users
from src.auth.config import AuthConfig
from src.scripts.chronicle.store import realm_for_map
from src.skins.discord_link import get_link_for_discord_id
from src.wars import actions as war_actions
from src.wars.history_model import WAR_KEY_RE
from src.wars.history_reads import battle_report, list_wars, war_page

war_history_router = APIRouter(tags=["wars"])


def _war_key(value: str) -> str:
    if not WAR_KEY_RE.match(value or ""):
        raise HTTPException(status_code=404, detail="War not found")
    return value


@war_history_router.get("/{map_name}/wars")
def get_wars(map_name: str, authorization: str | None = Header(default=None)):
    entry = ensure_map_access(map_name, authorization)
    return {"map_id": entry.id, "wars": list_wars(realm_for_map(entry.id))}


@war_history_router.get("/{map_name}/wars/{war_key}")
def get_war(map_name: str, war_key: str, authorization: str | None = Header(default=None)):
    entry = ensure_map_access(map_name, authorization)
    model = war_page(realm_for_map(entry.id), _war_key(war_key), entry.id)
    if model is None:
        raise HTTPException(status_code=404, detail="War not found")
    return {"map_id": entry.id, **model}


@war_history_router.get("/{map_name}/wars/{war_key}/battles/{record_id}")
def get_war_battle(
    map_name: str,
    war_key: str,
    record_id: str,
    authorization: str | None = Header(default=None),
):
    entry = ensure_map_access(map_name, authorization)
    report = battle_report(realm_for_map(entry.id), _war_key(war_key), record_id[:160], entry.id)
    if report is None:
        raise HTTPException(status_code=404, detail="Battle not found")
    return {"map_id": entry.id, **report}


# --- the signed-in player's side (contract v1.3) ----------------------------------------


class VoteBody(BaseModel):
    kind: str
    picks: list = []


class AvailabilityBody(BaseModel):
    """`{"date", "hours"}` replaces the marks on one date (`[]` clears them); `{"none": true}` says
    none of the shown days work."""

    date: str | None = None
    hours: list | None = None
    none: bool | None = None


class CallToArmsBody(BaseModel):
    target_faction_id: str
    accept: bool


def _signed_in_user(request: Request) -> dict | None:
    """The session's user, or None when signed out or the site has no sign-in."""
    config = AuthConfig.from_env()
    if not (config.enabled or config.via_site) or config.problems():
        return None
    return users.session_user(request.cookies.get(auth_routes.session_cookie(config)))


def _account(user: dict | None) -> str | None:
    if user is None:
        return None
    link = get_link_for_discord_id(user["discord_user_id"])
    return war_actions.account_key(link["player_uuid"]) if link else None


def _writer(request: Request) -> tuple[dict, str]:
    """(the signed-in user, their linked account) for a write from the site's own origin."""
    config = auth_routes._config()
    auth_routes.require_same_origin(request, config)
    user = auth_routes.current_user(request, config)
    account = _account(user)
    if account is None:
        raise HTTPException(status_code=409, detail="minecraft_not_linked")
    return user, account


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@war_history_router.get("/{map_name}/wars/{war_key}/me")
def get_war_me(
    map_name: str,
    war_key: str,
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
):
    """The signed-in user's eligibility, the open vote, their picks and actions, their open calls."""
    entry = ensure_map_access(map_name, authorization)
    _no_store(response)
    user = _signed_in_user(request)
    reply = war_actions.me(realm_for_map(entry.id), _war_key(war_key), _account(user), signed_in=user is not None)
    if reply is None:
        raise HTTPException(status_code=404, detail="War not found")
    return reply


@war_history_router.post("/{map_name}/wars/{war_key}/vote")
def post_war_vote(
    map_name: str,
    war_key: str,
    body: VoteBody,
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
):
    """Queue the user's picks for the open day or hour vote: `{"action": {...}}`."""
    entry = ensure_map_access(map_name, authorization)
    user, account = _writer(request)
    _no_store(response)
    try:
        action = war_actions.queue_vote(
            realm_for_map(entry.id), _war_key(war_key), account, body.kind, body.picks,
            discord_user_id=user["discord_user_id"],
        )
    except war_actions.WarActionError as e:
        raise HTTPException(status_code=e.status, detail=str(e)) from e
    return {"action": action}


@war_history_router.post("/{map_name}/wars/{war_key}/availability")
def post_war_availability(
    map_name: str,
    war_key: str,
    body: AvailabilityBody,
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
):
    """Queue a change to the user's battle availability (contract v1.4): `{"action": {...}}`."""
    entry = ensure_map_access(map_name, authorization)
    user, account = _writer(request)
    _no_store(response)
    payload = {"none": True} if body.none is True else {"date": body.date, "hours": body.hours}
    try:
        action = war_actions.queue_availability(
            realm_for_map(entry.id), _war_key(war_key), account, payload,
            discord_user_id=user["discord_user_id"],
        )
    except war_actions.WarActionError as e:
        raise HTTPException(status_code=e.status, detail=str(e)) from e
    return {"action": action}


@war_history_router.post("/{map_name}/wars/{war_key}/call-to-arms")
def post_war_call_to_arms(
    map_name: str,
    war_key: str,
    body: CallToArmsBody,
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
):
    """Queue the user's answer to an open call to arms: `{"action": {...}}`."""
    entry = ensure_map_access(map_name, authorization)
    user, account = _writer(request)
    _no_store(response)
    try:
        action = war_actions.queue_call_answer(
            realm_for_map(entry.id), _war_key(war_key), account,
            {"target_faction_id": body.target_faction_id, "accept": body.accept},
            source="web", discord_user_id=user["discord_user_id"],
        )
    except war_actions.WarActionError as e:
        raise HTTPException(status_code=e.status, detail=str(e)) from e
    return {"action": action}
