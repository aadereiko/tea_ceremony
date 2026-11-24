import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.analytics import build_analytics
from app.deps import CurrentMember, Db
from app.models import Participant, Rating, Tea
from app.schemas import Analytics, ParticipantOut, RatingIn, RatingOut, TeaIn, TeaOut

router = APIRouter(prefix="/api/rooms/{slug}", tags=["teas"])


def _tea_query(room_id: uuid.UUID):
    return (
        select(Tea)
        .where(Tea.room_id == room_id)
        .options(selectinload(Tea.ratings).selectinload(Rating.participant))
        .order_by(Tea.created_at)
    )


def tea_out(tea: Tea, me: Participant, people: dict[uuid.UUID, Participant]) -> TeaOut:
    mine = next((r for r in tea.ratings if r.participant_id == me.id), None)
    overalls = [r.overall for r in tea.ratings if r.overall is not None]
    creator = people.get(tea.created_by_id) if tea.created_by_id else None
    return TeaOut(
        id=tea.id,
        name=tea.name,
        ingredients=tea.ingredients,
        notes=tea.notes,
        created_by=ParticipantOut.model_validate(creator) if creator else None,
        created_at=tea.created_at,
        rating_count=len(tea.ratings),
        average_overall=round(sum(overalls) / len(overalls), 2) if mine and overalls else None,
        my_rating=RatingIn.model_validate(mine, from_attributes=True) if mine else None,
        ratings=[
            RatingOut(
                **RatingIn.model_validate(r, from_attributes=True).model_dump(),
                participant=ParticipantOut.model_validate(r.participant),
                updated_at=r.updated_at,
            )
            for r in tea.ratings
        ]
        if mine
        else None,
    )


async def _load_tea(db: Db, member: CurrentMember, tea_id: uuid.UUID) -> Tea:
    tea = await db.scalar(_tea_query(member.room.id).where(Tea.id == tea_id))
    if tea is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tea not found")
    return tea


def _people(member: CurrentMember) -> dict[uuid.UUID, Participant]:
    return {p.id: p for p in member.room.participants}


@router.get("/teas")
async def list_teas(member: CurrentMember, db: Db) -> list[TeaOut]:
    teas = (await db.scalars(_tea_query(member.room.id))).all()
    people = _people(member)
    return [tea_out(t, member.me, people) for t in teas]


@router.post("/teas", status_code=status.HTTP_201_CREATED)
async def add_tea(body: TeaIn, member: CurrentMember, db: Db) -> TeaOut:
    tea = Tea(room_id=member.room.id, created_by_id=member.me.id, **body.model_dump())
    db.add(tea)
    await db.flush()
    return tea_out(await _load_tea(db, member, tea.id), member.me, _people(member))


@router.patch("/teas/{tea_id}")
async def edit_tea(tea_id: uuid.UUID, body: TeaIn, member: CurrentMember, db: Db) -> TeaOut:
    tea = await _load_tea(db, member, tea_id)
    for field, value in body.model_dump().items():
        setattr(tea, field, value)
    await db.flush()
    return tea_out(tea, member.me, _people(member))


@router.delete("/teas/{tea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tea(tea_id: uuid.UUID, member: CurrentMember, db: Db) -> Response:
    tea = await _load_tea(db, member, tea_id)
    if tea.created_by_id not in (None, member.me.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the person who added this tea can delete it"
        )
    await db.delete(tea)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/teas/{tea_id}/rating")
async def rate_tea(tea_id: uuid.UUID, body: RatingIn, member: CurrentMember, db: Db) -> TeaOut:
    tea = await _load_tea(db, member, tea_id)
    rating = next((r for r in tea.ratings if r.participant_id == member.me.id), None)
    if rating is None:
        rating = Rating(tea=tea, participant=member.me)
        db.add(rating)
    for field, value in body.model_dump().items():
        setattr(rating, field, value)
    await db.flush()
    db.expire(tea)
    return tea_out(await _load_tea(db, member, tea_id), member.me, _people(member))


@router.delete("/teas/{tea_id}/rating")
async def unrate_tea(tea_id: uuid.UUID, member: CurrentMember, db: Db) -> TeaOut:
    tea = await _load_tea(db, member, tea_id)
    rating = next((r for r in tea.ratings if r.participant_id == member.me.id), None)
    if rating is not None:
        await db.delete(rating)
        await db.flush()
        db.expire(tea)
    return tea_out(await _load_tea(db, member, tea_id), member.me, _people(member))


@router.get("/analytics")
async def analytics(member: CurrentMember, db: Db) -> Analytics:
    teas = list((await db.scalars(_tea_query(member.room.id))).all())
    return build_analytics(teas, list(member.room.participants))
