import uuid
from statistics import mean

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import AnyMember, Db, Member
from app.models import Participant, Shop, ShopComment, ShopScore
from app.names import normalize_name
from app.schemas import (
    ShopAuthor,
    ShopCommentIn,
    ShopCommentOut,
    ShopIn,
    ShopOut,
    ShopScoreIn,
    ShopScoreOut,
    ShopSummary,
    TeaRef,
)

router = APIRouter(prefix="/api/shops", tags=["shops"])

SHOP_LOAD = (selectinload(Shop.scores), selectinload(Shop.comments), selectinload(Shop.teas))


def _author(row: ShopScore | ShopComment, me: Participant) -> ShopAuthor:
    return ShopAuthor(name=row.author_name, icon=row.author_icon, is_me=row.author_id == me.id)


def _summary(shop: Shop, me: Participant) -> ShopSummary:
    mine = next((s.score for s in shop.scores if s.author_id == me.id), None)
    return ShopSummary(
        id=shop.id,
        name=shop.name,
        country=shop.country,
        city=shop.city,
        address=shop.address,
        website=shop.website,
        latitude=shop.latitude,
        longitude=shop.longitude,
        score_count=len(shop.scores),
        average_score=round(mean(s.score for s in shop.scores), 2) if shop.scores else None,
        my_score=mine,
        comment_count=len(shop.comments),
    )


def _shop_out(shop: Shop, me: Participant) -> ShopOut:
    return ShopOut(
        **_summary(shop, me).model_dump(),
        teas=[TeaRef.model_validate(tea) for tea in shop.teas],
        scores=[
            ShopScoreOut(author=_author(s, me), score=s.score, updated_at=s.updated_at)
            for s in sorted(shop.scores, key=lambda s: -s.score)
        ],
        comments=[
            ShopCommentOut(id=c.id, author=_author(c, me), text=c.text, created_at=c.created_at)
            for c in shop.comments
        ],
    )


async def _load(db: Db, shop_id: uuid.UUID) -> Shop:
    shop = await db.scalar(select(Shop).where(Shop.id == shop_id).options(*SHOP_LOAD))
    if shop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shop not found")
    return shop


async def _check_unique(db: Db, body: ShopIn, except_id: uuid.UUID | None = None) -> None:
    query = select(Shop.id).where(
        Shop.name_key == normalize_name(body.name),
        Shop.city_key == normalize_name(body.city),
        Shop.country == body.country,
    )
    if except_id:
        query = query.where(Shop.id != except_id)
    if await db.scalar(query):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"“{body.name}” in {body.city} is already on the list."
        )


def _apply(shop: Shop, body: ShopIn) -> None:
    shop.name, shop.name_key = body.name, normalize_name(body.name)
    shop.city, shop.city_key = body.city, normalize_name(body.city)
    shop.country, shop.address, shop.website = body.country, body.address, body.website
    shop.latitude, shop.longitude = body.latitude, body.longitude


async def _reload(db: Db, shop: Shop, member: Member) -> ShopOut:
    await db.flush()
    db.expunge(shop)
    return _shop_out(await _load(db, shop.id), member.me)


@router.get("")
async def list_shops(member: AnyMember, db: Db) -> list[ShopSummary]:
    shops = await db.scalars(select(Shop).options(*SHOP_LOAD).order_by(Shop.name_key))
    return [_summary(s, member.me) for s in shops]


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_shop(body: ShopIn, member: AnyMember, db: Db) -> ShopOut:
    await _check_unique(db, body)
    shop = Shop()
    _apply(shop, body)
    db.add(shop)
    return await _reload(db, shop, member)


@router.get("/{shop_id}")
async def get_shop(shop_id: uuid.UUID, member: AnyMember, db: Db) -> ShopOut:
    return _shop_out(await _load(db, shop_id), member.me)


@router.patch("/{shop_id}")
async def edit_shop(shop_id: uuid.UUID, body: ShopIn, member: AnyMember, db: Db) -> ShopOut:
    shop = await _load(db, shop_id)
    await _check_unique(db, body, except_id=shop.id)
    _apply(shop, body)
    return await _reload(db, shop, member)


@router.delete("/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_shop(shop_id: uuid.UUID, member: AnyMember, db: Db) -> Response:
    shop = await _load(db, shop_id)
    if any(row.author_id != member.me.id for row in [*shop.scores, *shop.comments]):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Other people have scored or commented on this shop, so it can't be deleted.",
        )
    await db.delete(shop)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{shop_id}/score")
async def score_shop(shop_id: uuid.UUID, body: ShopScoreIn, member: AnyMember, db: Db) -> ShopOut:
    shop = await _load(db, shop_id)
    mine = next((s for s in shop.scores if s.author_id == member.me.id), None)
    if mine is None:
        mine = ShopScore(
            author_id=member.me.id,
            author_name=member.me.display_name,
            author_icon=member.me.icon,
            score=body.score,
        )
        shop.scores.append(mine)
    mine.score = body.score
    return await _reload(db, shop, member)


@router.delete("/{shop_id}/score")
async def unscore_shop(shop_id: uuid.UUID, member: AnyMember, db: Db) -> ShopOut:
    shop = await _load(db, shop_id)
    shop.scores = [s for s in shop.scores if s.author_id != member.me.id]
    return await _reload(db, shop, member)


@router.post("/{shop_id}/comments", status_code=status.HTTP_201_CREATED)
async def comment_on_shop(
    shop_id: uuid.UUID, body: ShopCommentIn, member: AnyMember, db: Db
) -> ShopOut:
    shop = await _load(db, shop_id)
    shop.comments.append(
        ShopComment(
            author_id=member.me.id,
            author_name=member.me.display_name,
            author_icon=member.me.icon,
            text=body.text,
        )
    )
    return await _reload(db, shop, member)


@router.delete("/{shop_id}/comments/{comment_id}")
async def remove_comment(
    shop_id: uuid.UUID, comment_id: uuid.UUID, member: AnyMember, db: Db
) -> ShopOut:
    shop = await _load(db, shop_id)
    comment = next((c for c in shop.comments if c.id == comment_id), None)
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if comment.author_id != member.me.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete your own comments")
    shop.comments.remove(comment)
    return await _reload(db, shop, member)
