import tomllib
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
APP_VERSION = tomllib.loads((API_ROOT / "pyproject.toml").read_text())["project"]["version"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    database_url: str = f"sqlite+aiosqlite:///{API_ROOT / 'tea_ceremony.db'}"
    cors_origins: str = "http://localhost:5190"
    static_dir: str = str(REPO_ROOT / "web" / "dist")
    max_failed_joins: int = 10
    failed_join_window_seconds: int = 600

    @field_validator("database_url")
    @classmethod
    def use_async_driver(cls, url: str) -> str:
        # Hosts hand out plain postgres:// URLs; SQLAlchemy needs the async driver named.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url.removeprefix(prefix)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
