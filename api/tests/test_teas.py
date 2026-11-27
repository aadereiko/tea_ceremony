from tests.conftest import auth, join, make_room


async def setup_two(client, **settings):
    created = await make_room(client, **settings)
    slug = created["room"]["slug"]
    other = (await join(client, slug, "Michutek")).json()
    return slug, created["token"], other["token"]


async def add_new_tea(client, slug, token, name, ingredients=(), **extra):
    res = await client.post(
        f"/api/rooms/{slug}/teas",
        json={"new_tea": {"name": name, "ingredients": list(ingredients), **extra}},
        headers=auth(token),
    )
    assert res.status_code == 201, res.text
    return res.json()


async def rate(client, slug, token, tasting_id, overall, **extra):
    res = await client.put(
        f"/api/rooms/{slug}/teas/{tasting_id}/rating",
        json={"overall": overall, **extra},
        headers=auth(token),
    )
    assert res.status_code == 200, res.text
    return res.json()


async def reveal_scores(client, slug, token, tasting_id):
    res = await client.patch(
        f"/api/rooms/{slug}/teas/{tasting_id}/visibility",
        json={"scores_revealed": True},
        headers=auth(token),
    )
    assert res.status_code == 200, res.text


async def test_new_tea_goes_into_catalog_and_room(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(
        client, slug, me, "  Angel   kiss ", [" vanilla", "Vanilla", "", "rose  hip"]
    )
    assert tasting["tea"]["name"] == "Angel kiss"
    assert [i["name"] for i in tasting["tea"]["ingredients"]] == ["vanilla", "rose hip"]
    catalog = (await client.get("/api/catalog/teas", headers=auth(me))).json()
    assert [(t["name"], t["room_count"]) for t in catalog] == [("Angel kiss", 1)]


async def test_same_tea_in_two_rooms_keeps_ratings_apart(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "Sencha")
    await rate(client, slug, me, tasting["id"], 9)

    other = await make_room(client, "Friday", "Ola")
    res = await client.post(
        f"/api/rooms/{other['room']['slug']}/teas",
        json={"tea_id": tasting["tea"]["id"]},
        headers=auth(other["token"]),
    )
    assert res.status_code == 201, res.text
    assert res.json()["rating_count"] == 0
    assert res.json()["tea"]["room_count"] == 2

    again = await client.post(
        f"/api/rooms/{slug}/teas", json={"tea_id": tasting["tea"]["id"]}, headers=auth(me)
    )
    assert again.status_code == 409


async def test_new_tea_with_taken_name_is_rejected(client):
    slug, me, _ = await setup_two(client)
    await add_new_tea(client, slug, me, "Sencha")
    other = await make_room(client, "Friday", "Ola")
    res = await client.post(
        f"/api/rooms/{other['room']['slug']}/teas",
        json={"new_tea": {"name": "SENCHA"}},
        headers=auth(other["token"]),
    )
    assert res.status_code == 409


async def test_scores_hidden_until_anyone_reveals_them(client):
    slug, me, other = await setup_two(client, hide_scores=True)
    tasting = await add_new_tea(client, slug, me, "Gingerbread")
    await rate(client, slug, other, tasting["id"], 8, note="lovely")
    after = await rate(client, slug, me, tasting["id"], 6, smell=7, buy_again=True)

    assert after["my_rating"]["overall"] == 6
    assert after["ratings"] is None and after["average_overall"] is None
    assert after["rating_count"] == 2

    res = await client.patch(
        f"/api/rooms/{slug}/teas/{tasting['id']}/visibility",
        json={"scores_revealed": True},
        headers=auth(other),
    )
    assert res.status_code == 200
    seen = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(me))).json()[0]
    assert seen["scores_revealed"] is True and seen["average_overall"] == 7
    assert {r["participant"]["display_name"] for r in seen["ratings"]} == {"Sashka", "Michutek"}

    res = await client.patch(
        f"/api/rooms/{slug}/teas/{tasting['id']}/visibility",
        json={"scores_revealed": False},
        headers=auth(me),
    )
    assert res.json()["ratings"] is None and res.json()["average_overall"] is None


async def test_scores_show_at_once_when_room_does_not_hide_them(client):
    slug, me, other = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "Sencha")
    await rate(client, slug, other, tasting["id"], 8)
    after = await rate(client, slug, me, tasting["id"], 6)

    assert after["scores_revealed"] is True and after["average_overall"] == 7
    assert len(after["ratings"]) == 2
    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert data["rating_count"] == 2


async def test_anonymous_room_hides_scores_unless_told_not_to(client):
    hidden = await make_room(client, anonymous=True)
    shown = await make_room(client, anonymous=True, hide_scores=False)
    named = await make_room(client)

    assert hidden["room"]["hide_scores"] is True
    assert shown["room"]["hide_scores"] is False
    assert named["room"]["hide_scores"] is False


async def test_turning_hiding_back_on_keeps_revealed_teas_revealed(client):
    slug, host, guest = await setup_two(client, hide_scores=True)
    kept = await add_new_tea(client, slug, host, "Kept")
    other = await add_new_tea(client, slug, host, "Other")
    await rate(client, slug, guest, kept["id"], 5)
    await rate(client, slug, guest, other["id"], 7)
    await reveal_scores(client, slug, guest, kept["id"])

    await client.patch(f"/api/rooms/{slug}", json={"hide_scores": False}, headers=auth(host))
    teas = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(guest))).json()
    assert [t["scores_revealed"] for t in teas] == [True, True]

    await client.patch(f"/api/rooms/{slug}", json={"hide_scores": True}, headers=auth(host))
    teas = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(guest))).json()
    assert [t["scores_revealed"] for t in teas] == [True, False]


async def test_rating_is_updated_not_duplicated(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "Nantou")
    await rate(client, slug, me, tasting["id"], 3)
    again = await rate(client, slug, me, tasting["id"], 9)
    assert again["rating_count"] == 1
    assert again["my_rating"]["overall"] == 9


async def test_score_out_of_range_is_rejected(client):
    slug, me, _ = await setup_two(client)
    tasting = await add_new_tea(client, slug, me, "Nantou")
    res = await client.put(
        f"/api/rooms/{slug}/teas/{tasting['id']}/rating", json={"overall": 11}, headers=auth(me)
    )
    assert res.status_code == 422


async def test_only_host_adds_and_removes_teas(client):
    slug, host, guest = await setup_two(client)
    res = await client.post(
        f"/api/rooms/{slug}/teas", json={"new_tea": {"name": "Puerh"}}, headers=auth(guest)
    )
    assert res.status_code == 403

    tasting = await add_new_tea(client, slug, host, "Sticky rice")
    url = f"/api/rooms/{slug}/teas/{tasting['id']}"
    assert (await client.delete(url, headers=auth(guest))).status_code == 403
    assert (await client.delete(url, headers=auth(host))).status_code == 204
    assert (await client.get(f"/api/rooms/{slug}/teas", headers=auth(host))).json() == []
    catalog = (await client.get("/api/catalog/teas", headers=auth(host))).json()
    assert [t["name"] for t in catalog] == ["Sticky rice"]


async def test_analytics_compares_with_own_average(client):
    slug, me, other = await setup_two(client, hide_scores=True)
    a = await add_new_tea(client, slug, me, "Citrus one", ["Lemon", "green tea"])
    b = await add_new_tea(client, slug, me, "Spicy one", ["Ginger", "black tea"])
    await rate(client, slug, me, a["id"], 8)
    await rate(client, slug, me, b["id"], 4)
    await rate(client, slug, other, a["id"], 10)
    await rate(client, slug, other, b["id"], 10)

    hidden = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert hidden["tea_count"] == 2 and hidden["rating_count"] == 0 and hidden["ranking"] == []

    await reveal_scores(client, slug, me, a["id"])
    await reveal_scores(client, slug, me, b["id"])
    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert data["tea_count"] == 2 and data["rating_count"] == 4
    assert [r["name"] for r in data["ranking"]] == ["Citrus one", "Spicy one"]

    lemon = next(i for i in data["ingredients"] if i["ingredient"] == "Lemon")
    ginger = next(i for i in data["ingredients"] if i["ingredient"] == "Ginger")
    assert lemon["relative_all"] == 1.0
    assert ginger["relative_all"] == -1.0

    pair = data["agreement"][0]
    assert pair["shared_teas"] == 2 and pair["mean_difference"] == 4.0


async def test_blind_room_hides_tea_until_anyone_reveals(client):
    created = await client.post(
        "/api/rooms",
        json={"name": "Blind", "password": "tea-time", "display_name": "Host", "blind": True},
    )
    slug, host = created.json()["room"]["slug"], created.json()["token"]
    guest = (await join(client, slug, "Guest")).json()["token"]
    tasting = await add_new_tea(
        client, slug, host, "Secret Sencha", ["green tea"], notes="80 °C, 3 min"
    )
    assert tasting["hidden"] is True and tasting["tea"] is None

    seen = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(guest))).json()[0]
    assert seen["tea"] is None and seen["tea_id"] is None
    assert seen["notes"] == "80 °C, 3 min"
    as_host = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(host))).json()[0]
    assert as_host["tea"] is None and as_host["tea_id"] == tasting["tea_id"]
    await rate(client, slug, guest, tasting["id"], 8)
    await reveal_scores(client, slug, guest, tasting["id"])
    ranking = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(guest))).json()
    assert ranking["ranking"][0]["name"] == "Mystery tea #1"
    assert ranking["ingredients"] == []

    url = f"/api/rooms/{slug}/teas/{tasting['id']}/visibility"
    res = await client.patch(url, json={"revealed": True}, headers=auth(guest))
    assert res.status_code == 200
    seen = (await client.get(f"/api/rooms/{slug}/teas", headers=auth(host))).json()[0]
    assert seen["hidden"] is False and seen["tea"]["name"] == "Secret Sencha"

    hidden_again = await client.patch(url, json={"revealed": False}, headers=auth(host))
    assert hidden_again.json()["hidden"] is True and hidden_again.json()["tea"] is None


async def test_anonymous_room_hides_who_rated(client):
    created = await client.post(
        "/api/rooms",
        json={
            "name": "Anon",
            "password": "tea-time",
            "display_name": "Host",
            "blind": False,
            "anonymous": True,
        },
    )
    slug, host = created.json()["room"]["slug"], created.json()["token"]
    guest = (await join(client, slug, "Guest")).json()["token"]
    tasting = await add_new_tea(client, slug, host, "Oolong")
    await rate(client, slug, guest, tasting["id"], 4, note="meh")
    await rate(client, slug, host, tasting["id"], 9)
    res = await client.patch(
        f"/api/rooms/{slug}/teas/{tasting['id']}/visibility",
        json={"scores_revealed": True},
        headers=auth(guest),
    )
    after = res.json()

    assert all(r["participant"] is None for r in after["ratings"])
    assert sorted(r["is_mine"] for r in after["ratings"]) == [False, True]
    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(host))).json()
    assert data["anonymous"] is True
    assert data["people"] == [] and data["agreement"] == []
    assert data["taster_count"] == 2
    assert all(r["updated_at"] is None for r in after["ratings"])


async def test_only_host_changes_room_settings(client):
    slug, host, guest = await setup_two(client)
    res = await client.patch(f"/api/rooms/{slug}", json={"blind": False}, headers=auth(guest))
    assert res.status_code == 403
    res = await client.patch(
        f"/api/rooms/{slug}", json={"blind": False, "anonymous": True}, headers=auth(host)
    )
    assert res.json()["room"]["blind"] is False and res.json()["room"]["anonymous"] is True


async def test_ranking_trusts_a_tea_more_when_more_people_rated_it(client):
    slug, me, other = await setup_two(client)
    lucky = await add_new_tea(client, slug, me, "One fan")
    liked = await add_new_tea(client, slug, me, "Both like it")
    disliked = await add_new_tea(client, slug, me, "Nobody likes it")
    await rate(client, slug, me, lucky["id"], 10)
    for token in (me, other):
        await rate(client, slug, token, liked["id"], 9)
        await rate(client, slug, token, disliked["id"], 2)

    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert data["room_average"] == 6.4 and data["prior_votes"] == 2
    ranking = {r["name"]: r for r in data["ranking"]}
    assert [r["name"] for r in data["ranking"]] == ["Both like it", "One fan", "Nobody likes it"]
    assert ranking["One fan"]["average_overall"] == 10
    assert ranking["One fan"]["fair_score"] == 7.6
    assert ranking["Both like it"]["fair_score"] == 7.7


async def test_taste_map_spread_is_how_far_apart_the_scores_are(client):
    slug, me, other = await setup_two(client)
    split = await add_new_tea(client, slug, me, "Splits the room")
    solo = await add_new_tea(client, slug, me, "Only one score")
    await rate(client, slug, me, split["id"], 9)
    await rate(client, slug, other, split["id"], 2)
    await rate(client, slug, me, solo["id"], 6)

    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    spread = {r["name"]: r["spread"] for r in data["ranking"]}
    assert spread == {"Splits the room": 7, "Only one score": None}


async def rate_five(client, slug, token):
    for n, overall in enumerate([2, 4, 6, 8, 10]):
        tea = await add_new_tea(client, slug, token, f"Tea {n}")
        await rate(
            client, slug, token, tea["id"], overall, smell=overall, taste=10 - overall, finish=5
        )


async def test_drivers_show_which_score_moves_with_overall(client):
    slug, me, _ = await setup_two(client)
    await rate_five(client, slug, me)

    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert data["min_driver_teas"] == 5
    everyone = data["drivers"][0]
    by_name = {d["participant"]["display_name"]: d for d in data["drivers"][1:]}
    assert everyone["participant"] is None
    assert by_name["Sashka"]["teas"] == 5
    assert by_name["Sashka"]["correlation"] == {"smell": 1.0, "taste": -1.0, "finish": None}
    assert by_name["Michutek"]["teas"] == 0
    assert by_name["Michutek"]["correlation"]["smell"] is None


async def test_drivers_need_enough_teas(client):
    slug, me, _ = await setup_two(client)
    for n in range(4):
        tea = await add_new_tea(client, slug, me, f"Tea {n}")
        await rate(client, slug, me, tea["id"], n * 2, smell=n * 2)
    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert all(d["correlation"]["smell"] is None for d in data["drivers"])


async def test_anonymous_room_only_shows_everyones_drivers(client):
    slug, me, _ = await setup_two(client, anonymous=True, hide_scores=False)
    await rate_five(client, slug, me)
    data = (await client.get(f"/api/rooms/{slug}/analytics", headers=auth(me))).json()
    assert len(data["drivers"]) == 1 and data["drivers"][0]["participant"] is None
    assert data["drivers"][0]["correlation"]["smell"] == 1.0
