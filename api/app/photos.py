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


# Every ingredient with a shipped photo exists in the catalog, so people can pick it before any
# tea uses it. One deleted by hand comes back on the next start: the photo list is the starter set.
async def fill_known_photos(db: AsyncSession) -> None:
    present = {
        i.name_key: i
        for i in await db.scalars(select(Ingredient).where(Ingredient.name_key.in_(KNOWN_PHOTOS)))
    }
    for key, photo in KNOWN_PHOTOS.items():
        ingredient = present.get(key)
        if ingredient is None:
            ingredient = Ingredient(name=photo["name"], name_key=key)
            db.add(ingredient)
        apply_known_photo(ingredient)
