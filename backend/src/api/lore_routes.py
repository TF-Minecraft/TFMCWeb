"""The lore panel API (/lore). Staff and lore team members only.

Everything but `/lore/access` is hidden (404) while the panel is switched off
(`LORE_PANEL`, see src/lore/flag.py). Reads need a signed-in member; writes also
need the site's own origin. The bot's notification outbox uses the staff key.
See docs/docs/lore/README.md.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import APIRouter, Depends, File, Header, HTTPException, Path, Query, Request, Response, UploadFile
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from src.api.auth_routes import _config, _no_store, current_user, require_same_origin
from src.api.request_body import read_json_body
from src.lore import availability, entities, flag, history, links, notifications, overview, people, search, team
from src.lore.entities import Kind
from src.lore.errors import LoreError
from src.skins.auth import HEADER_STAFF_KEY, AuthError, require_staff_key

lore_router = APIRouter(prefix="/lore", tags=["lore"])

BODY_LIMIT = 256 * 1024
FACE_CACHE = "private, max-age=300"


def ID() -> Any:
    """A positive id path parameter. A fresh Path per use: FastAPI binds an instance to one name."""
    return Path(ge=1, le=2**62)


def require_enabled() -> None:
    if not flag.enabled():
        raise HTTPException(404, detail="Not Found")


_gated = APIRouter(dependencies=[Depends(require_enabled)])


class AckBody(BaseModel):
    ids: list[int] = Field(default_factory=list, max_length=1000)


def _require_staff(x_staff_key: str | None) -> None:
    try:
        require_staff_key(x_staff_key)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


def _http(err: LoreError) -> HTTPException:
    return HTTPException(err.status, detail=jsonable_encoder(err.detail))


def _viewer_sync(request: Request) -> people.Viewer:
    viewer = people.viewer(current_user(request, _config()))
    if not viewer.access:
        raise HTTPException(403, detail="no_access")
    return viewer


async def _reader(request: Request, response: Response) -> people.Viewer:
    _no_store(response)
    return await run_in_threadpool(_viewer_sync, request)


async def _writer(request: Request, response: Response) -> people.Viewer:
    require_same_origin(request, _config())
    return await _reader(request, response)


async def _call(fn: Callable[..., Any], *args: Any) -> Any:
    try:
        return await run_in_threadpool(fn, *args)
    except LoreError as err:
        raise _http(err) from None


async def _json(request: Request) -> Any:
    return await read_json_body(request, BODY_LIMIT)


def _png(data: bytes | None) -> Response:
    if data is None:
        raise HTTPException(404, detail="not_found")
    return Response(content=data, media_type="image/png", headers={"Cache-Control": FACE_CACHE})


# --------------------
# Access (always answers, so the site can decide whether to show the link)
# --------------------


def _access(request: Request) -> dict[str, Any]:
    if not flag.enabled():
        return {"enabled": False, "access": False, "can_manage_team": False, "user": None}
    try:
        user = current_user(request, _config())
    except HTTPException:
        return {"enabled": True, "access": False, "can_manage_team": False, "user": None}
    viewer = people.viewer(user)
    return {
        "enabled": True,
        "access": viewer.access,
        "can_manage_team": viewer.access and viewer.can_manage_team,
        "user": viewer.public() if viewer.access else None,
    }


@lore_router.get("/access")
async def get_access(request: Request, response: Response):
    _no_store(response)
    return await run_in_threadpool(_access, request)


# --------------------
# Overview, search, deleted items
# --------------------


@_gated.get("/overview")
async def get_overview(viewer: people.Viewer = Depends(_reader)):
    return await _call(overview.overview, viewer)


@_gated.get("/search")
async def get_search(
    q: str = Query(default="", max_length=120),
    kinds: str = Query(default="", max_length=200),
    limit: int = Query(default=search.DEFAULT_LIMIT, ge=1, le=search.MAX_LIMIT),
    viewer: people.Viewer = Depends(_reader),
):
    return {"results": await _call(search.search, q, kinds or None, limit)}


@_gated.get("/deleted")
async def get_deleted(viewer: people.Viewer = Depends(_reader)):
    return {"items": await _call(entities.deleted_items)}


# --------------------
# Availability, settings, calendar
# --------------------


@_gated.get("/availability/me")
async def get_my_availability(
    start: str = Query(alias="from", max_length=10),
    end: str = Query(alias="to", max_length=10),
    viewer: people.Viewer = Depends(_reader),
):
    return await _call(availability.mine, viewer, start, end)


@_gated.put("/availability/me/weekly")
async def put_my_weekly(request: Request, viewer: people.Viewer = Depends(_writer)):
    return await _call(availability.set_weekly, viewer, await _json(request))


@_gated.put("/availability/me/days")
async def put_my_days(request: Request, viewer: people.Viewer = Depends(_writer)):
    return await _call(availability.set_days, viewer, await _json(request))


@_gated.put("/me/settings")
async def put_my_settings(request: Request, viewer: people.Viewer = Depends(_writer)):
    return await _call(availability.set_settings, viewer, await _json(request))


@_gated.get("/availability")
async def get_availability(
    start: str = Query(alias="from", max_length=10),
    end: str = Query(alias="to", max_length=10),
    viewer: people.Viewer = Depends(_reader),
):
    return await _call(availability.grid, start, end)


@_gated.get("/availability/day/{day}")
async def get_availability_day(day: str = Path(max_length=10), viewer: people.Viewer = Depends(_reader)):
    return {"day": day, "people": await _call(availability.roster_on, day)}


@_gated.get("/calendar")
async def get_calendar(
    start: str = Query(alias="from", max_length=10),
    end: str = Query(alias="to", max_length=10),
    viewer: people.Viewer = Depends(_reader),
):
    return await _call(availability.calendar, start, end)


# --------------------
# Team
# --------------------


@_gated.get("/team")
async def get_team(viewer: people.Viewer = Depends(_reader)):
    return await _call(team.team)


@_gated.get("/team/candidates")
async def get_team_candidates(q: str = Query(default="", max_length=64), viewer: people.Viewer = Depends(_reader)):
    if not viewer.can_manage_team:
        raise HTTPException(403, detail="forbidden")
    return {"candidates": await _call(team.candidates, q)}


@_gated.post("/team")
async def post_team(request: Request, viewer: people.Viewer = Depends(_writer)):
    return await _call(team.add, await _json(request), viewer)


@_gated.patch("/team/{user_id}")
async def patch_team(request: Request, user_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
    return await _call(team.update, user_id, await _json(request), viewer)


@_gated.delete("/team/{user_id}")
async def delete_team(user_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
    return await _call(team.remove, user_id, viewer)


@_gated.get("/team/{user_id}/head.png")
async def get_team_head(user_id: int = ID(), viewer: people.Viewer = Depends(_reader)):
    def run() -> bytes | None:
        from src.auth import account_overview

        uuid = people.head_uuid(user_id)
        return account_overview.head(uuid) if uuid else None

    return _png(await run_in_threadpool(run))


# --------------------
# Links between things
# --------------------


@_gated.post("/relations")
async def post_relation(request: Request, viewer: people.Viewer = Depends(_writer)):
    return await _call(links.create_relation, await _json(request), viewer)


@_gated.patch("/relations/{relation_id}")
async def patch_relation(request: Request, relation_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
    return await _call(links.update_relation, relation_id, await _json(request), viewer)


@_gated.delete("/relations/{relation_id}")
async def delete_relation(relation_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
    return await _call(links.delete_relation, relation_id, viewer)


def _link_route(path: str, fn: Callable[[int, Any, people.Viewer], dict]) -> None:
    async def put_link(request: Request, entity_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
        return await _call(fn, entity_id, await _json(request), viewer)

    put_link.__name__ = f"put_{fn.__name__}"
    _gated.put(path)(put_link)


_link_route("/characters/{entity_id}/affiliations", links.set_affiliations)
_link_route("/characters/{entity_id}/player", links.set_player)
_link_route("/organisations/{entity_id}/members", links.set_organisation_members)
_link_route("/storylines/{entity_id}/members", links.set_storyline_members)
_link_route("/storylines/{entity_id}/order", links.set_storyline_order)
_link_route("/events/{entity_id}/helpers", links.set_event_helpers)
_link_route("/events/{entity_id}/characters", links.set_event_characters)


# --------------------
# Character faces
# --------------------


@_gated.post("/characters/{character_id}/skin")
async def post_character_skin(
    character_id: int = ID(),
    skin: UploadFile = File(...),
    viewer: people.Viewer = Depends(_writer),
):
    data = await skin.read(links.MAX_SKIN_BYTES + 1)
    return await _call(links.set_skin, character_id, data, viewer)


@_gated.delete("/characters/{character_id}/skin")
async def delete_character_skin(character_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
    return await _call(links.clear_skin, character_id, viewer)


@_gated.get("/characters/{character_id}/face.png")
async def get_character_face(character_id: int = ID(), viewer: people.Viewer = Depends(_reader)):
    return _png(await run_in_threadpool(links.face, character_id))


# --------------------
# The bot's notification outbox (staff key)
# --------------------


@_gated.get("/staff/notifications")
def get_lore_notifications(
    limit: int = Query(default=notifications.DEFAULT_LIMIT, ge=1, le=notifications.MAX_LIMIT),
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """Undelivered DMs, oldest first; each is offered again 10 minutes after it was handed out."""
    _require_staff(x_staff_key)
    return {"outbox_id": notifications.outbox_id(), "notifications": notifications.pending(limit)}


@_gated.post("/staff/notifications/ack")
def post_lore_notifications_ack(
    body: AckBody,
    x_staff_key: str | None = Header(default=None, alias=HEADER_STAFF_KEY),
):
    """`{"ids": [...]}` -> `{"acked": [ids that exist]}`."""
    _require_staff(x_staff_key)
    return {"acked": notifications.ack(body.ids)}


# --------------------
# Characters, organisations, storylines, locations, events
# --------------------


def _kind_routes(kind: Kind) -> None:
    base = f"/{kind.plural}"

    async def list_kind(
        q: str = Query(default="", max_length=120),
        status: str | None = Query(default=None, max_length=32),
        include_deleted: bool = False,
        viewer: people.Viewer = Depends(_reader),
    ):
        return {"items": await _call(entities.list_items, kind, q, status, include_deleted)}

    async def create_kind(request: Request, viewer: people.Viewer = Depends(_writer)):
        return await _call(entities.create, kind, await _json(request), viewer)

    async def get_kind(entity_id: int = ID(), viewer: people.Viewer = Depends(_reader)):
        return await _call(entities.detail, kind, entity_id)

    async def update_kind(request: Request, entity_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
        return await _call(entities.update, kind, entity_id, await _json(request), viewer)

    async def delete_kind(entity_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
        return await _call(entities.delete, kind, entity_id, viewer)

    async def restore_kind(entity_id: int = ID(), viewer: people.Viewer = Depends(_writer)):
        return await _call(entities.restore, kind, entity_id, viewer)

    async def history_kind(entity_id: int = ID(), viewer: people.Viewer = Depends(_reader)):
        return {"history": await _call(history.for_entity, kind.name, entity_id)}

    for fn, method, path in (
        (list_kind, "get", base),
        (create_kind, "post", base),
        (get_kind, "get", base + "/{entity_id}"),
        (update_kind, "patch", base + "/{entity_id}"),
        (delete_kind, "delete", base + "/{entity_id}"),
        (restore_kind, "post", base + "/{entity_id}/restore"),
        (history_kind, "get", base + "/{entity_id}/history"),
    ):
        fn.__name__ = f"{fn.__name__}_{kind.name}"
        getattr(_gated, method)(path)(fn)


for _kind in entities.KINDS.values():
    _kind_routes(_kind)

lore_router.include_router(_gated)
