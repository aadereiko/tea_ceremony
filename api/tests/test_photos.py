import json
from pathlib import Path

import pytest

from app import photos
from app.db import SessionLocal
from app.photos import KNOWN_PHOTOS, PHOTOS_FILE, fill_known_photos
from tests.conftest import auth
from tests.test_catalog import ingredients
from tests.test_teas import add_new_tea, setup_two

WEB_PHOTOS = Path(__file__).parents[2] / "web" / "public" / "ingredients"
ROSE = {
    "name": "Rose",
    "file": "rose.webp",
    "credit": "Photo: Ann, CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rose.jpg",
}


@pytest.fixture
def rose_photo(monkeypatch):
    monkeypatch.setattr(photos, "KNOWN_PHOTOS", {"rose": ROSE})


async def test_new_ingredient_gets_its_shipped_photo(client, rose_photo):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "A", ["ROSE", "Mint"])
    rose, mint = tasting["tea"]["ingredients"]
    assert rose["image_url"] == "/ingredients/rose.webp"
    assert rose["image_credit"] == "Photo: Ann, CC BY 4.0"
    assert rose["image_source"] == "https://commons.wikimedia.org/wiki/File:Rose.jpg"
    assert mint["image_url"] is None


async def test_renaming_onto_a_photo_name_picks_the_photo_up(client, rose_photo):
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "A", ["Rosa"])
    rosa = (await ingredients(client, me))["Rosa"]
    res = await client.patch(
        f"/api/catalog/ingredients/{rosa['id']}", json={"name": "Rose"}, headers=auth(me)
    )
    assert res.json()["ingredient"]["image_url"] == "/ingredients/rose.webp"


async def test_startup_fills_ingredients_that_existed_before_their_photo(client, monkeypatch):
    monkeypatch.setattr(photos, "KNOWN_PHOTOS", {})
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "A", ["Rose"])
    assert (await ingredients(client, me))["Rose"]["image_url"] is None

    monkeypatch.setattr(photos, "KNOWN_PHOTOS", {"rose": ROSE})
    async with SessionLocal.begin() as db:
        await fill_known_photos(db)
    assert (await ingredients(client, me))["Rose"]["image_url"] == "/ingredients/rose.webp"


def test_every_listed_photo_ships_with_a_credit():
    listed = json.loads(PHOTOS_FILE.read_text())
    assert len(KNOWN_PHOTOS) == len(listed), "two entries normalize to the same name"
    for photo in listed:
        assert (WEB_PHOTOS / photo["file"]).is_file(), photo["file"]
        assert photo["credit"].strip(), photo["name"]
        assert photo["source"].startswith("https://commons.wikimedia.org/"), photo["name"]


async def test_startup_creates_listed_ingredients_nobody_used_yet(client, monkeypatch):
    slug, me, _ = await setup_two(client)
    monkeypatch.setattr(photos, "KNOWN_PHOTOS", {"rose": ROSE})
    async with SessionLocal.begin() as db:
        await fill_known_photos(db)
        await fill_known_photos(db)
    found = await ingredients(client, me)
    assert list(found) == ["Rose"]
    assert found["Rose"]["tea_count"] == 0
    assert found["Rose"]["image_url"] == "/ingredients/rose.webp"
