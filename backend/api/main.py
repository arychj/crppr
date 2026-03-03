import os
import time
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import engine
from .models import Base
from .routers import items, metadata, ident, settings, inventory, stats

_log = logging.getLogger(__name__)

# Run Alembic migrations on startup (retry if DB isn't ready yet)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_alembic_cfg = AlembicConfig(str(_BACKEND_DIR / "alembic.ini"))
_alembic_cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
_alembic_cfg.set_main_option("sqlalchemy.url", engine.url.render_as_string(hide_password=False))

for _attempt in range(1, 11):
    try:
        command.upgrade(_alembic_cfg, "head")
        break
    except Exception as exc:
        if _attempt == 10:
            raise
        _log.warning("DB not ready (attempt %d/10): %s — retrying in 2s", _attempt, exc)
        time.sleep(2)

app = FastAPI(
    title="crppr",
    version="0.1.0",
    description="Recursive home inventory system",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=[
        {"name": "items", "description": "CRUD operations on inventory items"},
        {"name": "metadata", "description": "Metadata attribute management"},
        {"name": "ident", "description": "Ident generation service"},
        {"name": "settings", "description": "Application settings"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/api", tags=["items"])
app.include_router(metadata.router, prefix="/api")
app.include_router(ident.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(inventory.router, prefix="/api", tags=["inventory"])
app.include_router(stats.router, prefix="/api", tags=["stats"])


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


# ── Serve the React frontend build ──────────────────────────────────
# Resolve the dist directory relative to this file's location.
# In Docker: /app/frontend/dist   In dev: ../frontend/dist (may not exist)
_FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if _FRONTEND_DIR.is_dir():
    # Serve static assets (js, css, images) under /assets
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIR / "assets"), name="static-assets")

    # Catch-all: serve index.html for any non-API route so client-side routing works
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        # If a specific file exists in dist, serve it (e.g. favicon, manifest)
        file_path = _FRONTEND_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_FRONTEND_DIR / "index.html")
