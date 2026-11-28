from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import APP_VERSION, get_settings
from app.db import SessionLocal
from app.photos import fill_known_photos
from app.routes import catalog, rooms, shops, teas

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Listed ingredients are created and given their photo here, so adding one needs no data
    # migration: drop the file in, list it in ingredient_photos.json, deploy.
    async with SessionLocal.begin() as db:
        await fill_known_photos(db)
    yield


app = FastAPI(title="Tea Ceremony API", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(rooms.router)
app.include_router(teas.router)
app.include_router(catalog.router)
app.include_router(shops.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": APP_VERSION}


static = Path(settings.static_dir)
if (static / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

    # Every non-API path returns the React app, so a deep link like /r/abc123 works on reload.
    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404)
        candidate = (static / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(static.resolve()):
            return FileResponse(candidate)
        return FileResponse(static / "index.html")
