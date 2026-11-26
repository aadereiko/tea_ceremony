import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import delete, func, select, update

from app.catalog import TEA_LOAD, catalog_tea_out, create_tea, edit_tea, load_tea, room_counts
from app.deps import AnyMember, Db
from app.models import Ingredient, Tea, TeaIngredient
from app.names import normalize_name
from app.schemas import (
    CatalogTeaOut,
    IngredientOut,
    IngredientRename,
    IngredientRenamed,
    TeaIn,
)

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/teas")
async def list_teas(_: AnyMember, db: Db) -> list[CatalogTeaOut]:
    teas = (await db.scalars(select(Tea).options(TEA_LOAD).order_by(Tea.name_key))).all()
    counts = await room_counts(db, [t.id for t in teas])
    return [catalog_tea_out(t, counts.get(t.id, 0)) for t in teas]


@router.post("/teas", status_code=status.HTTP_201_CREATED)
async def add_tea(body: TeaIn, _: AnyMember, db: Db) -> CatalogTeaOut:
    tea = await create_tea(db, body)
    return catalog_tea_out(await load_tea(db, tea.id), 0)


@router.patch("/teas/{tea_id}")
async def change_tea(tea_id: uuid.UUID, body: TeaIn, _: AnyMember, db: Db) -> CatalogTeaOut:
    tea = await load_tea(db, tea_id)
    await edit_tea(db, tea, body)
    return catalog_tea_out(tea, (await room_counts(db, [tea_id])).get(tea_id, 0))


@router.delete("/teas/{tea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tea(tea_id: uuid.UUID, _: AnyMember, db: Db) -> Response:
    tea = await load_tea(db, tea_id)
    if (await room_counts(db, [tea.id])).get(tea.id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Rooms are still tasting this tea. Remove it from those rooms first.",
        )
    await db.delete(tea)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _ingredient_out(db: Db, ingredient: Ingredient) -> IngredientOut:
    count = await db.scalar(
        select(func.count()).where(TeaIngredient.ingredient_id == ingredient.id)
    )
    return IngredientOut(id=ingredient.id, name=ingredient.name, tea_count=count or 0)


@router.get("/ingredients")
async def list_ingredients(_: AnyMember, db: Db) -> list[IngredientOut]:
    rows = await db.execute(
        select(Ingredient, func.count(TeaIngredient.tea_id))
        .outerjoin(TeaIngredient)
        .group_by(Ingredient.id)
        .order_by(Ingredient.name_key)
    )
    return [IngredientOut(id=i.id, name=i.name, tea_count=count) for i, count in rows]


@router.patch("/ingredients/{ingredient_id}")
async def rename_ingredient(
    ingredient_id: uuid.UUID, body: IngredientRename, _: AnyMember, db: Db
) -> IngredientRenamed:
    ingredient = await db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ingredient not found")
    key = normalize_name(body.name)
    target = await db.scalar(
        select(Ingredient).where(Ingredient.name_key == key, Ingredient.id != ingredient.id)
    )
    if target is None:
        ingredient.name, ingredient.name_key = body.name, key
        await db.flush()
        return IngredientRenamed(ingredient=await _ingredient_out(db, ingredient), merged=False)

    # Renaming onto an existing name merges the two. Teas that already list the target would
    # end up with it twice, so their old link is dropped instead of moved.
    already_has_target = select(TeaIngredient.tea_id).where(
        TeaIngredient.ingredient_id == target.id
    )
    await db.execute(
        delete(TeaIngredient).where(
            TeaIngredient.ingredient_id == ingredient.id,
            TeaIngredient.tea_id.in_(already_has_target),
        )
    )
    await db.execute(
        update(TeaIngredient)
        .where(TeaIngredient.ingredient_id == ingredient.id)
        .values(ingredient_id=target.id)
    )
    await db.execute(delete(Ingredient).where(Ingredient.id == ingredient.id))
    target.name = body.name
    await db.flush()
    return IngredientRenamed(ingredient=await _ingredient_out(db, target), merged=True)


@router.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_ingredient(ingredient_id: uuid.UUID, _: AnyMember, db: Db) -> Response:
    await db.execute(delete(Ingredient).where(Ingredient.id == ingredient_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
