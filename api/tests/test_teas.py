from tests.conftest import auth, join, make_room


async def setup_two(client):
    created = await make_room(client)
    slug = created["room"]["slug"]
    other = (await join(client, slug, "Michutek")).json()
    return slug, created["token"], other["token"]


async def add_tea(client, slug, token, name, ingredients=()):
    res = await client.post(
        f"/api/rooms/{slug}/teas",
        json={"name": name, "ingredients": list(ingredients)},
        headers=auth(token),
    )
    assert res.status_code == 201, res.text
    return res.json()


async def rate(client, slug, token, tea_id, overall, **extra):
    res = await client.put(
        f"/api/rooms/{slug}/teas/{tea_id}/rating",
        json={"overall": overall, **extra},
        headers=auth(token),
    )
    assert res.status_code == 200, res.text
    return res.json()


async def test_add_tea_cleans_ingredients(client):
    slug, me, _ = await setup_two(client)
    tea = await add_tea(
        client, slug, me, "  Angel   kiss ", [" vanilla", "Vanilla", "", "rose  hip"]
    )
    assert tea["name"] == "Angel kiss"
    assert tea["ingredients"] == ["vanilla", "rose hip"]


async def test_others_ratings_hidden_until_you_rate(client):
    slug, me, other = await setup_two(client)
    tea = await add_tea(client, slug, me, "Gingerbread")
    await rate(client, slug, other, tea["id"], 8, note="lovely")

    before = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(me))).json()[0]
    assert before["ratings"] is None
    assert before["average_overall"] is None
    assert before["rating_count"] == 1

    after = await rate(client, slug, me, tea["id"], 6, smell=7, buy_again=True)
    assert after["my_rating"]["overall"] == 6
    assert after["average_overall"] == 7
    assert {r["participant"]["display_name"] for r in after["ratings"]} == {"Sashka", "Michutek"}


async def test_rating_is_updated_not_duplicated(client):
    slug, me, _ = await setup_two(client)
    tea = await add_tea(client, slug, me, "Nantou")
    await rate(client, slug, me, tea["id"], 3)
    again = await rate(client, slug, me, tea["id"], 9)
    assert again["rating_count"] == 1
    assert again["my_rating"]["overall"] == 9


async def test_score_out_of_range_is_rejected(client):
    slug, me, _ = await setup_two(client)
    tea = await add_tea(client, slug, me, "Nantou")
    res = await client.put(
        f"/api/rooms/{slug}/teas/{tea['id']}/rating", json={"overall": 11}, headers=auth(me)
    )
    assert res.status_code == 422


async def test_only_creator_deletes_tea(client):
    slug, me, other = await setup_two(client)
    tea = await add_tea(client, slug, me, "Sticky rice")
    url = f"/api/rooms/{slug}/teas/{tea['id']}"
    assert (await client.delete(url, headers=auth(other))).status_code == 403
    assert (await client.delete(url, headers=auth(me))).status_code == 204
    assert (await client.get(f"/api/rooms/{slug}/teas", headers=auth(me))).json() == []


async def test_analytics_compares_with_own_average(client):
    slug, me, other = await setup_two(client)
    a = await add_tea(client, slug, me, "Citrus one", ["Lemon", "green tea"])
    b = await add_tea(client, slug, me, "Spicy one", ["Ginger", "black tea"])
    await rate(client, slug, me, a["id"], 8)
    await rate(client, slug, me, b["id"], 4)
    await rate(client, slug, other, a["id"], 10)
    await rate(client, slug, other, b["id"], 10)

    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert data["tea_count"] == 2 and data["rating_count"] == 4
    assert [r["name"] for r in data["ranking"]] == ["Citrus one", "Spicy one"]

    lemon = next(i for i in data["ingredients"] if i["ingredient"] == "Lemon")
    ginger = next(i for i in data["ingredients"] if i["ingredient"] == "Ginger")
    assert lemon["relative_all"] == 1.0
    assert ginger["relative_all"] == -1.0

    pair = data["agreement"][0]
    assert pair["shared_teas"] == 2 and pair["mean_difference"] == 4.0
