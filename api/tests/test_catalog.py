from tests.conftest import auth, make_room
from tests.test_teas import add_new_tea, setup_two


async def ingredients(client, token):
    res = await client.get("/api/catalog/ingredients", headers=auth(token))
    assert res.status_code == 200, res.text
    return {i["name"]: i for i in res.json()}


async def test_catalog_needs_some_room_login(client):
    assert (await client.get("/api/catalog/teas")).status_code == 401


async def test_ingredients_are_shared_across_rooms(client):
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "A", ["Vanilla", "Rose"])
    other = await make_room(client, "Other", "Ola")
    await add_new_tea(client, other["room"]["slug"], other["token"], "B", ["vanilla"])
    found = await ingredients(client, other["token"])
    assert found["Vanilla"]["tea_count"] == 2
    assert found["Rose"]["tea_count"] == 1


async def test_edit_catalog_tea(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "A", ["Vanilla", "Rose"], icon="teapot")
    res = await client.patch(
        f"/api/catalog/teas/{tasting['tea']['id']}",
        json={"name": "A", "ingredients": ["Rose", "Mint", "vanilla"], "color": "ruby"},
        headers=auth(me),
    )
    assert res.status_code == 200, res.text
    tea = res.json()
    assert [i["name"] for i in tea["ingredients"]] == ["Rose", "Mint", "Vanilla"]
    assert tea["icon"] == "teapot" and tea["color"] == "ruby"


async def test_catalog_tea_in_use_cannot_be_deleted(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "A")
    url = f"/api/catalog/teas/{tasting['tea']['id']}"
    assert (await client.delete(url, headers=auth(me))).status_code == 409
    await client.delete(f"/api/rooms/{slug}/teas/{tasting['id']}", headers=auth(me))
    assert (await client.delete(url, headers=auth(me))).status_code == 204


async def test_rename_into_existing_merges(client):
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "A", ["Vanila"])
    await add_new_tea(client, slug, me, "B", ["Vanilla", "Vanila"])
    found = await ingredients(client, me)

    res = await client.patch(
        f"/api/catalog/ingredients/{found['Vanila']['id']}",
        json={"name": "vanilla"},
        headers=auth(me),
    )
    assert res.status_code == 200, res.text
    assert res.json()["merged"] is True
    assert res.json()["ingredient"]["id"] == found["Vanilla"]["id"]
    assert res.json()["ingredient"]["tea_count"] == 2
    teas = (await client.get("/api/catalog/teas", headers=auth(me))).json()
    assert [[i["name"] for i in t["ingredients"]] for t in teas] == [["vanilla"], ["vanilla"]]


async def test_delete_ingredient_removes_it_from_teas(client):
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "A", ["Vanilla", "Moon dust"])
    found = await ingredients(client, me)
    url = f"/api/catalog/ingredients/{found['Moon dust']['id']}"
    assert (await client.delete(url, headers=auth(me))).status_code == 204
    teas = (await client.get("/api/catalog/teas", headers=auth(me))).json()
    assert [i["name"] for i in teas[0]["ingredients"]] == ["Vanilla"]


async def test_icons_default_and_can_change(client):
    created = await make_room(client)
    slug, token = created["room"]["slug"], created["token"]
    assert created["room"]["icon"] and created["me"]["icon"]

    res = await client.patch(f"/api/rooms/{slug}/me", json={"icon": "owl"}, headers=auth(token))
    assert res.json()["me"]["icon"] == "owl"
    res = await client.patch(f"/api/rooms/{slug}", json={"icon": "lantern"}, headers=auth(token))
    assert res.json()["room"]["icon"] == "lantern"


async def test_icon_must_come_from_its_own_set(client):
    created = await make_room(client)
    slug, token = created["room"]["slug"], created["token"]
    for url, icon in [(f"/api/rooms/{slug}/me", "teapot"), (f"/api/rooms/{slug}", "fox")]:
        res = await client.patch(url, json={"icon": icon}, headers=auth(token))
        assert res.status_code == 422
    res = await client.post(
        "/api/catalog/teas", json={"name": "Butterfly pea", "color": "#3e63c4"}, headers=auth(token)
    )
    assert res.status_code == 422
