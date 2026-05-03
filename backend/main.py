"""FastAPI application entry point for the Gym Form Checker.

In development, the React frontend runs on its own Vite dev server
(port 5174) and proxies /api/* to this backend.  In production, the
built frontend is served from frontend/dist/.

Requirements: 4.1
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router as api_router

app = FastAPI(
    title="GymBro",
    description="AI-assisted exercise form analysis",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — permissive for local development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
app.include_router(api_router)

# ---------------------------------------------------------------------------
# Serve built React frontend (production only — in dev, use Vite on :5174)
# ---------------------------------------------------------------------------
_dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(_dist_dir):
    _assets_dir = os.path.join(_dist_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    _index_path = os.path.join(_dist_dir, "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA — all non-API routes return index.html."""
        file_path = os.path.join(_dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(_index_path)
