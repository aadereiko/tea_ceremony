import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.analytics import build_analytics
from app.catalog import TEA_LOAD, catalog_tea_out, create_tea, load_tea, room_counts
from app.deps import CurrentMember, Db, Member
from app.models import Participant, Rating, Tasting, is_hidden
from app.schemas import (
    Analytics,
    ParticipantOut,
    RatingIn,
    RatingOut,
    TastingAdd,
    TastingOut,
    VisibilityIn,
)

router = APIRouter(prefix="/api/rooms/{slug}", tags=["tastings"])


def _tasting_query(room_id: uuid.UUID):
    return (
        select(Tasting)
        .where(Tasting.room_id == room_id)
        .options(
            selectinload(Tasting.ratings).selectinload(Rating.participant),
            selectinload(Tasting.tea).options(TEA_LOAD),
        )
        .order_by(Tasting.created_at)
    )


def _rating_out(rating: Rating, me: Participant, anonymous: bool) -> RatingOut:
    return RatingOut(
        **RatingIn.model_validate(rating, from_attributes=True).model_dump(),
        participant=None if anonymous else ParticipantOut.model_validate(rating.participant),
        is_mine=rating.participant_id == me.id,
        updated_at=rating.updated_at,
    )


def tasting_out(tasting: Tasting, member: Member, counts: dict[uuid.UUID, int]) -> TastingOut:
    room, me = member.room, member.me
    mine = next((r for r in tasting.ratings if r.participant_id == me.id), None)
    overalls = [r.overall for r in tasting.ratings if r.overall is not None]
    adder = next((p for p in room.participants if p.id == tasting.added_by_id), None)
    # Rating ids are random, so sorting by them shuffles rows: in an anonymous room the order
    # must not match the order people joined, or the rows could be matched back to names.
    ratings = sorted(tasting.ratings, key=lambda r: r.id) if room.anonymous else tasting.ratings
    hidden = is_hidden(tasting, room)
    return TastingOut(
        id=tasting.id,
        tea=None if hidden else catalog_tea_out(tasting.tea, counts.get(tasting.tea_id, 1)),
        hidden=hidden,
        added_by=ParticipantOut.model_validate(adder) if adder else None,
        created_at=tasting.created_at,
        rating_count=len(tasting.ratings),
        average_overall=(
            round(sum(overalls) / len(overalls), 2)
            if tasting.scores_revealed and overalls
            else None
        ),
        my_rating=RatingIn.model_validate(mine, from_attributes=True) if mine else None,
        scores_revealed=tasting.scores_revealed,
        ratings=(
            [_rating_out(r, me, room.anonymous) for r in ratings]
            if tasting.scores_revealed
            else None
        ),
    )


async def _load(db: Db, member: CurrentMember, tasting_id: uuid.UUID) -> Tasting:
    tasting = await db.scalar(
        _tasting_query(member.room.id)
        .where(Tasting.id == tasting_id)
        .execution_options(populate_existing=True)
    )
    if tasting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This tea isn't in the room")
    return tasting


async def _out(db: Db, member: CurrentMember, tasting: Tasting) -> TastingOut:
    return tasting_out(tasting, member, await room_counts(db, [tasting.tea_id]))


@router.get("/teas")
async def list_tastings(member: CurrentMember, db: Db) -> list[TastingOut]:
    tastings = (await db.scalars(_tasting_query(member.room.id))).all()
    counts = await room_counts(db, [t.tea_id for t in tastings])
    return [tasting_out(t, member, counts) for t in tastings]


@router.post("/teas", status_code=status.HTTP_201_CREATED)
async def add_tasting(body: TastingAdd, member: CurrentMember, db: Db) -> TastingOut:
    if not member.me.is_owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the host can add teas to this room")
    if body.new_tea:
        tea_id = (await create_tea(db, body.new_tea)).id
    else:
        tea_id = (await load_tea(db, body.tea_id)).id
    tasting = Tasting(room_id=member.room.id, tea_id=tea_id, added_by_id=member.me.id)
    db.add(tasting)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This tea is already in the room") from None
    return await _out(db, member, await _load(db, member, tasting.id))


@router.delete("/teas/{tasting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tasting(tasting_id: uuid.UUID, member: CurrentMember, db: Db) -> Response:
    tasting = await _load(db, member, tasting_id)
    if not member.me.is_owner:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Only the host can remove teas from this room",
        )
    await db.delete(tasting)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/teas/{tasting_id}/visibility")
async def set_visibility(
    tasting_id: uuid.UUID, body: VisibilityIn, member: CurrentMember, db: Db
) -> TastingOut:
    tasting = await _load(db, member, tasting_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tasting, field, value)
    await db.flush()
    return await _out(db, member, tasting)


@router.put("/teas/{tasting_id}/rating")
async def rate(tasting_id: uuid.UUID, body: RatingIn, member: CurrentMember, db: Db) -> TastingOut:
    tasting = await _load(db, member, tasting_id)
    rating = next((r for r in tasting.ratings if r.participant_id == member.me.id), None)
    if rating is None:
        rating = Rating(tasting=tasting, participant=member.me)
        db.add(rating)
    for field, value in body.model_dump().items():
        setattr(rating, field, value)
    await db.flush()
    return await _out(db, member, await _load(db, member, tasting_id))


@router.delete("/teas/{tasting_id}/rating")
async def unrate(tasting_id: uuid.UUID, member: CurrentMember, db: Db) -> TastingOut:
    tasting = await _load(db, member, tasting_id)
    rating = next((r for r in tasting.ratings if r.participant_id == member.me.id), None)
    if rating is not None:
        await db.delete(rating)
        await db.flush()
    return await _out(db, member, await _load(db, member, tasting_id))


@router.get("/analytics")
async def analytics(member: CurrentMember, db: Db) -> Analytics:
    tastings = list((await db.scalars(_tasting_query(member.room.id))).all())
    return build_analytics(tastings, member.room)
