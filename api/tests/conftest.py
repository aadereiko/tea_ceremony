import os
import tempfile
from pathlib import Path

_db_file = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_db_file}"
os.environ["STATIC_DIR"] = str(Path(tempfile.mkdtemp()))

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.security import failed_joins  # noqa: E402


@pytest.fixture(autouse=True)
async def fresh_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    failed_joins.reset()
    yield


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def make_room(client: AsyncClient, name: str = "Advent", who: str = "Sashka") -> dict:
    res = await client.post(
        "/api/rooms", json={"name": name, "password": "tea-time", "display_name": who}
    )
    assert res.status_code == 201, res.text
    return res.json()


async def join(client: AsyncClient, slug: str, who: str, password: str = "tea-time"):
    return await client.post(
        f"/api/rooms/{slug}/join", json={"password": password, "display_name": who}
    )
