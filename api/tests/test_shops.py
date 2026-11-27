from tests.conftest import auth, join, make_room

SHOP = {
    "name": "Czajownia",
    "country": "PL",
    "city": "Kraków",
    "address": "ul. Józefa 1",
    "website": "czajownia.pl",
    "latitude": 50.05,
    "longitude": 19.94,
}


async def add_shop(client, token, **changes):
    res = await client.post("/api/shops", json=SHOP | changes, headers=auth(token))
    assert res.status_code == 201, res.text
    return res.json()


async def two_people(client):
    created = await make_room(client)
    other = (await join(client, created["room"]["slug"], "Michał")).json()
    return created["token"], other["token"]


async def test_shops_need_a_room_login(client):
    assert (await client.get("/api/shops")).status_code == 401


async def test_add_and_list_a_shop(client):
    me, _ = await two_people(client)
    shop = await add_shop(client, me)
    assert shop["website"] == "https://czajownia.pl"
    assert shop["score_count"] == 0 and shop["average_score"] is None
    listed = (await client.get("/api/shops", headers=auth(me))).json()
    assert [s["name"] for s in listed] == ["Czajownia"]


async def test_website_cannot_run_code(client):
    me, _ = await two_people(client)
    shop = await add_shop(client, me, website="javascript:alert(1)")
    assert shop["website"].startswith("https://")


async def test_same_shop_in_same_city_is_refused(client):
    me, _ = await two_people(client)
    await add_shop(client, me)
    res = await client.post("/api/shops", json=SHOP | {"name": " czajownia "}, headers=auth(me))
    assert res.status_code == 409
    await add_shop(client, me, city="Warszawa")


async def test_location_needs_both_coordinates(client):
    me, _ = await two_people(client)
    res = await client.post("/api/shops", json=SHOP | {"longitude": None}, headers=auth(me))
    assert res.status_code == 422
    shop = await add_shop(client, me, latitude=None, longitude=None, name="No map")
    assert shop["latitude"] is None


async def test_each_person_scores_once_and_can_change_it(client):
    me, other = await two_people(client)
    shop = await add_shop(client, me)
    url = f"/api/shops/{shop['id']}/score"
    await client.put(url, json={"score": 6}, headers=auth(me))
    await client.put(url, json={"score": 9}, headers=auth(me))
    res = await client.put(url, json={"score": 7}, headers=auth(other))
    data = res.json()
    assert data["score_count"] == 2 and data["average_score"] == 8
    assert data["my_score"] == 7
    assert [(s["author"]["name"], s["score"]) for s in data["scores"]] == [
        ("Sashka", 9),
        ("Michał", 7),
    ]
    assert (await client.put(url, json={"score": 11}, headers=auth(me))).status_code == 422

    data = (await client.delete(url, headers=auth(other))).json()
    assert data["score_count"] == 1 and data["my_score"] is None


async def test_comments_can_only_be_deleted_by_their_author(client):
    me, other = await two_people(client)
    shop = await add_shop(client, me)
    data = (
        await client.post(
            f"/api/shops/{shop['id']}/comments", json={"text": "  Great puer  "}, headers=auth(me)
        )
    ).json()
    comment = data["comments"][0]
    assert comment["text"] == "Great puer" and comment["author"]["is_me"]

    url = f"/api/shops/{shop['id']}/comments/{comment['id']}"
    assert (await client.delete(url, headers=auth(other))).status_code == 403
    assert (await client.delete(url, headers=auth(me))).json()["comments"] == []


async def test_shop_with_other_peoples_reviews_cannot_be_deleted(client):
    me, other = await two_people(client)
    shop = await add_shop(client, me)
    await client.put(f"/api/shops/{shop['id']}/score", json={"score": 5}, headers=auth(other))
    assert (await client.delete(f"/api/shops/{shop['id']}", headers=auth(me))).status_code == 409

    await client.delete(f"/api/shops/{shop['id']}/score", headers=auth(other))
    await client.put(f"/api/shops/{shop['id']}/score", json={"score": 5}, headers=auth(me))
    assert (await client.delete(f"/api/shops/{shop['id']}", headers=auth(me))).status_code == 204


async def test_reviews_stay_when_the_authors_room_is_deleted(client):
    me, _ = await two_people(client)
    other_room = await make_room(client, "Other", "Ola")
    shop = await add_shop(client, me)
    await client.put(
        f"/api/shops/{shop['id']}/score", json={"score": 8}, headers=auth(other_room["token"])
    )
    res = await client.delete(
        f"/api/rooms/{other_room['room']['slug']}", headers=auth(other_room["token"])
    )
    assert res.status_code == 204
    data = (await client.get(f"/api/shops/{shop['id']}", headers=auth(me))).json()
    assert data["scores"][0]["author"]["name"] == "Ola"
    assert data["average_score"] == 8


async def test_a_tea_lists_where_to_buy_it_and_a_shop_lists_its_teas(client):
    me, _ = await two_people(client)
    shop = await add_shop(client, me)
    other = await add_shop(client, me, name="Herbaciarnia")
    res = await client.post(
        "/api/catalog/teas",
        json={"name": "Dong Ding", "shop_ids": [shop["id"], other["id"]]},
        headers=auth(me),
    )
    assert res.status_code == 201, res.text
    tea = res.json()
    assert [s["name"] for s in tea["shops"]] == ["Czajownia", "Herbaciarnia"]

    data = (await client.get(f"/api/shops/{shop['id']}", headers=auth(me))).json()
    assert [t["name"] for t in data["teas"]] == ["Dong Ding"]


async def test_saving_a_tea_without_shop_ids_keeps_its_shops(client):
    me, _ = await two_people(client)
    shop = await add_shop(client, me)
    tea = (
        await client.post(
            "/api/catalog/teas",
            json={"name": "Dong Ding", "shop_ids": [shop["id"]]},
            headers=auth(me),
        )
    ).json()
    url = f"/api/catalog/teas/{tea['id']}"
    kept = (
        await client.patch(url, json={"name": "Dong Ding", "notes": "95 °C"}, headers=auth(me))
    ).json()
    assert [s["id"] for s in kept["shops"]] == [shop["id"]]
    cleared = (
        await client.patch(url, json={"name": "Dong Ding", "shop_ids": []}, headers=auth(me))
    ).json()
    assert cleared["shops"] == []


async def test_unknown_shop_is_refused(client):
    me, _ = await two_people(client)
    res = await client.post(
        "/api/catalog/teas",
        json={"name": "Dong Ding", "shop_ids": ["00000000-0000-0000-0000-000000000000"]},
        headers=auth(me),
    )
    assert res.status_code == 422


async def test_deleting_a_shop_unlinks_its_teas(client):
    me, _ = await two_people(client)
    shop = await add_shop(client, me)
    tea = (
        await client.post(
            "/api/catalog/teas",
            json={"name": "Dong Ding", "shop_ids": [shop["id"]]},
            headers=auth(me),
        )
    ).json()
    assert (await client.delete(f"/api/shops/{shop['id']}", headers=auth(me))).status_code == 204
    teas = (await client.get("/api/catalog/teas", headers=auth(me))).json()
    assert next(t for t in teas if t["id"] == tea["id"])["shops"] == []


async def test_a_mystery_tea_does_not_give_away_its_shops(client):
    created = await make_room(client, blind=True)
    slug, me = created["room"]["slug"], created["token"]
    guest = (await join(client, slug, "Michał")).json()["token"]
    shop = await add_shop(client, me)
    res = await client.post(
        f"/api/rooms/{slug}/teas",
        json={"new_tea": {"name": "Dong Ding", "shop_ids": [shop["id"]]}},
        headers=auth(me),
    )
    assert res.status_code == 201, res.text
    seen = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(guest))).json()[0]
    assert seen["hidden"] and seen["tea"] is None
    assert "Czajownia" not in str(seen)
