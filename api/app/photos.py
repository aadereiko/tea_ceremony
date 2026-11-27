import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ingredient
from app.names import normalize_name

PHOTOS_FILE = Path(__file__).parent / "ingredient_photos.json"
KNOWN_PHOTOS = {normalize_name(p["name"]): p for p in json.loads(PHOTOS_FILE.read_text())}


def apply_known_photo(ingredient: Ingredient) -> None:
    photo = KNOWN_PHOTOS.get(ingredient.name_key)
    if photo and ingredient.image_url is None:
        ingredient.image_url = f"/ingredients/{photo['file']}"
        ingredient.image_credit = photo["credit"]
        ingredient.image_source = photo["source"]


async def fill_known_photos(db: AsyncSession) -> None:
    missing = await db.scalars(
        select(Ingredient).where(
            Ingredient.image_url.is_(None), Ingredient.name_key.in_(KNOWN_PHOTOS)
        )
    )
    for ingredient in missing:
        apply_known_photo(ingredient)
