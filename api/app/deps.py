from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Participant, ParticipantSession, Room
from app.security import hash_token

# scope="function" commits before the response is sent. With the default, the commit runs after
# the client already has its answer, so a refetch right after a change could read the old data.
Db = Annotated[AsyncSession, Depends(get_db, scope="function")]


@dataclass
class Member:
    room: Room
    me: Participant


async def _session_member(db: AsyncSession, authorization: str | None) -> Member | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    row = await db.scalar(
        select(ParticipantSession)
        .where(ParticipantSession.token_hash == hash_token(token))
        .options(
            selectinload(ParticipantSession.participant)
            .selectinload(Participant.room)
            .selectinload(Room.participants)
        )
    )
    return Member(room=row.participant.room, me=row.participant) if row else None


async def get_member(
    slug: str, db: Db, authorization: Annotated[str | None, Header()] = None
) -> Member:
    member = await _session_member(db, authorization)
    if member is None or member.room.slug != slug:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Join this room first")
    return member


async def get_any_member(db: Db, authorization: Annotated[str | None, Header()] = None) -> Member:
    member = await _session_member(db, authorization)
    if member is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Join a room to use the tea catalog")
    return member


CurrentMember = Annotated[Member, Depends(get_member)]
AnyMember = Annotated[Member, Depends(get_any_member)]
