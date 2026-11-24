from app.names import normalize_name
from tests.conftest import auth, join, make_room


async def test_create_room_returns_session(client):
    body = await make_room(client)
    assert body["token"]
    assert body["me"]["display_name"] == "Sashka"
    assert [p["display_name"] for p in body["room"]["participants"]] == ["Sashka"]
    res = await client.get(f"/api/rooms/{body['room']['slug']}", headers=auth(body["token"]))
    assert res.status_code == 200


async def test_wrong_password_is_rejected(client):
    slug = (await make_room(client))["room"]["slug"]
    res = await join(client, slug, "Michutek", password="nope")
    assert res.status_code == 401


async def test_repeated_wrong_passwords_get_blocked(client):
    slug = (await make_room(client))["room"]["slug"]
    for _ in range(10):
        await join(client, slug, "Michutek", password="nope")
    res = await join(client, slug, "Michutek")
    assert res.status_code == 429


async def test_same_name_rejoins_as_same_person(client):
    created = await make_room(client)
    slug = created["room"]["slug"]
    res = await join(client, slug, "  sashka ")
    assert res.status_code == 200
    assert res.json()["me"]["id"] == created["me"]["id"]
    assert len(res.json()["room"]["participants"]) == 1


async def test_new_name_adds_participant(client):
    slug = (await make_room(client))["room"]["slug"]
    res = await join(client, slug, "Michutek")
    assert res.status_code == 200
    assert len(res.json()["room"]["participants"]) == 2


async def test_token_only_works_for_its_room(client):
    a = await make_room(client, "A")
    b = await make_room(client, "B")
    res = await client.get(f"/api/rooms/{b['room']['slug']}/teas", headers=auth(a["token"]))
    assert res.status_code == 401


async def test_missing_token_is_rejected(client):
    slug = (await make_room(client))["room"]["slug"]
    assert (await client.get(f"/api/rooms/{slug}/teas")).status_code == 401


def test_normalize_name_ignores_case_and_spacing():
    assert normalize_name("  Michał   Kowalski ") == normalize_name("michał kowalski")
    assert normalize_name("Straße") == normalize_name("STRASSE")
    assert normalize_name("Ａnna") == normalize_name("anna")
