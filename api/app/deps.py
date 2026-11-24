from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Participant, ParticipantSession, Room
from app.security import hash_token

Db = Annotated[AsyncSession, Depends(get_db)]


@dataclass
class Member:
    room: Room
    me: Participant


async def get_member(
    slug: str, db: Db, authorization: Annotated[str | None, Header()] = None
) -> Member:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Join this room first")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized
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
    if row is None or row.participant.room.slug != slug:
        raise unauthorized
    return Member(room=row.participant.room, me=row.participant)


CurrentMember = Annotated[Member, Depends(get_member)]
