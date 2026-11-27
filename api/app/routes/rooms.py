from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.deps import CurrentMember, Db
from app.icons import PERSON_ICONS, ROOM_ICONS, pick
from app.models import Participant, ParticipantSession, Room
from app.names import normalize_name
from app.schemas import (
    MeUpdate,
    ParticipantOut,
    RoomCreate,
    RoomJoin,
    RoomOut,
    RoomUpdate,
    SessionOut,
)
from app.security import (
    failed_joins,
    hash_password,
    hash_token,
    new_slug,
    new_token,
    verify_password,
)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def room_out(room: Room) -> RoomOut:
    return RoomOut(
        slug=room.slug,
        name=room.name,
        icon=room.icon,
        blind=room.blind,
        anonymous=room.anonymous,
        hide_scores=room.hide_scores,
        participants=[ParticipantOut.model_validate(p) for p in room.participants],
    )


def _name_key(display_name: str) -> tuple[str, str]:
    shown = " ".join(display_name.split())
    key = normalize_name(shown)
    if not key:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Name can't be blank")
    return shown, key


async def _start_session(db: Db, room: Room, me: Participant) -> SessionOut:
    token = new_token()
    db.add(ParticipantSession(participant=me, token_hash=hash_token(token)))
    await db.flush()
    await db.refresh(room, ["participants"])
    return SessionOut(token=token, room=room_out(room), me=ParticipantOut.model_validate(me))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_room(body: RoomCreate, db: Db) -> SessionOut:
    shown, key = _name_key(body.display_name)
    for _ in range(5):
        slug = new_slug()
        if await db.scalar(select(Room.id).where(Room.slug == slug)) is None:
            break
    room = Room(
        slug=slug,
        name=body.name.strip(),
        icon=body.icon or pick(ROOM_ICONS),
        blind=body.blind,
        anonymous=body.anonymous,
        hide_scores=body.anonymous if body.hide_scores is None else body.hide_scores,
        password_hash=hash_password(body.password),
    )
    me = Participant(
        room=room,
        display_name=shown,
        name_key=key,
        icon=body.my_icon or pick(PERSON_ICONS),
        is_owner=True,
    )
    db.add_all([room, me])
    await db.flush()
    return await _start_session(db, room, me)


@router.post("/{slug}/join")
async def join_room(slug: str, body: RoomJoin, db: Db, request: Request) -> SessionOut:
    limiter_key = slug
    if failed_joins.blocked(limiter_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many wrong passwords. Try again in a few minutes.",
        )
    room = await db.scalar(
        select(Room).where(Room.slug == slug).options(selectinload(Room.participants))
    )
    if room is None or not verify_password(body.password, room.password_hash):
        failed_joins.record_failure(limiter_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong room code or password")

    shown, key = _name_key(body.display_name)
    me = next((p for p in room.participants if p.name_key == key), None)
    if me is None:
        taken = {p.icon for p in room.participants}
        icon = body.my_icon or pick(PERSON_ICONS, taken)
        me = Participant(room=room, display_name=shown, name_key=key, icon=icon)
        db.add(me)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, "Someone just took that name") from None
    elif body.my_icon:
        me.icon = body.my_icon
    return await _start_session(db, room, me)


@router.get("/{slug}")
async def get_room(member: CurrentMember) -> SessionOut:
    return _session(member)


def _session(member: CurrentMember) -> SessionOut:
    return SessionOut(
        token="", room=room_out(member.room), me=ParticipantOut.model_validate(member.me)
    )


@router.patch("/{slug}")
async def update_room(body: RoomUpdate, member: CurrentMember, db: Db) -> SessionOut:
    if not member.me.is_owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the host can change the room")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(member.room, field, value)
    await db.flush()
    return _session(member)


@router.patch("/{slug}/me")
async def update_me(body: MeUpdate, member: CurrentMember, db: Db) -> SessionOut:
    member.me.icon = body.icon
    await db.flush()
    return _session(member)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(member: CurrentMember, db: Db) -> Response:
    if not member.me.is_owner:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the person who created this room can delete it"
        )
    # A bulk DELETE lets the database's ON DELETE CASCADE remove teas, ratings, people and
    # logins in one go; the ORM only knows about some of those links.
    await db.execute(delete(Room).where(Room.id == member.room.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
