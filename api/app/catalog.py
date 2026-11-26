import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.icons import TEA_ICONS, pick
from app.models import Ingredient, Tasting, Tea, TeaIngredient
from app.names import normalize_name
from app.schemas import CatalogTeaOut, IngredientRef, TeaIn

TEA_LOAD = selectinload(Tea.ingredient_links).selectinload(TeaIngredient.ingredient)


def catalog_tea_out(tea: Tea, room_count: int) -> CatalogTeaOut:
    return CatalogTeaOut(
        id=tea.id,
        name=tea.name,
        icon=tea.icon,
        color=tea.color,
        notes=tea.notes,
        ingredients=[
            IngredientRef.model_validate(link.ingredient) for link in tea.ingredient_links
        ],
        room_count=room_count,
    )


async def room_counts(db: AsyncSession, tea_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    rows = await db.execute(
        select(Tasting.tea_id, func.count())
        .where(Tasting.tea_id.in_(tea_ids))
        .group_by(Tasting.tea_id)
    )
    return dict(rows.all())


async def load_tea(db: AsyncSession, tea_id: uuid.UUID) -> Tea:
    tea = await db.scalar(select(Tea).where(Tea.id == tea_id).options(TEA_LOAD))
    if tea is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tea not found")
    return tea


async def _set_ingredients(db: AsyncSession, tea: Tea, names: list[str]) -> None:
    keys = {normalize_name(n): n for n in names}
    known = {
        i.name_key: i
        for i in await db.scalars(select(Ingredient).where(Ingredient.name_key.in_(keys)))
    }
    current = {link.ingredient.name_key: link for link in tea.ingredient_links}
    links = []
    for position, (key, name) in enumerate(keys.items()):
        # Reuse the existing link row: dropping and re-adding the same (tea, ingredient) pair in
        # one flush can insert the new row before deleting the old one and break the primary key.
        link = current.get(key) or TeaIngredient(
            ingredient=known.get(key) or Ingredient(name=name, name_key=key)
        )
        link.position = position
        links.append(link)
    tea.ingredient_links = links


async def _flush(db: AsyncSession) -> None:
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "That tea or ingredient name was just taken. Try again or pick it from the catalog.",
        ) from None


async def _name_taken(db: AsyncSession, key: str, except_id: uuid.UUID | None = None) -> bool:
    query = select(Tea.id).where(Tea.name_key == key)
    if except_id:
        query = query.where(Tea.id != except_id)
    return await db.scalar(query) is not None


async def create_tea(db: AsyncSession, body: TeaIn) -> Tea:
    key = normalize_name(body.name)
    if await _name_taken(db, key):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"“{body.name}” is already in the catalog. Pick it from there.",
        )
    tea = Tea(
        name=body.name,
        name_key=key,
        icon=body.icon or pick(TEA_ICONS),
        color=body.color,
        notes=body.notes,
        ingredient_links=[],
    )
    db.add(tea)
    await _set_ingredients(db, tea, body.ingredients)
    await _flush(db)
    return tea


async def edit_tea(db: AsyncSession, tea: Tea, body: TeaIn) -> None:
    key = normalize_name(body.name)
    if await _name_taken(db, key, except_id=tea.id):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Another tea is already called “{body.name}”."
        )
    tea.name, tea.name_key, tea.color, tea.notes = body.name, key, body.color, body.notes
    if body.icon:
        tea.icon = body.icon
    await _set_ingredients(db, tea, body.ingredients)
    await _flush(db)
