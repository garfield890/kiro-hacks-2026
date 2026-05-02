"""FastAPI application entry point for the Gym Form Checker.

Mounts the static frontend, registers API routes, and configures CORS
for development use.

Requirements: 4.1
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router as api_router

app = FastAPI(
    title="Gym Form Checker",
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
# Static file serving — frontend SPA
# ---------------------------------------------------------------------------
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
