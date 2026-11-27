import json

from app.config import APP_VERSION, REPO_ROOT


async def test_health_reports_version(client):
    res = await client.get("/api/health")
    assert res.json() == {"status": "ok", "version": APP_VERSION}


def test_website_and_api_share_one_version():
    website = json.loads((REPO_ROOT / "web" / "package.json").read_text())["version"]
    assert website == APP_VERSION, "Bump api/pyproject.toml and web/package.json together"
