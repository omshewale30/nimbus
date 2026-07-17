"""Aggregate all /api/v1 routes into a single router."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import admin, ask, content, insights, me, projects

api_router = APIRouter()
api_router.include_router(me.router)
api_router.include_router(content.router)
api_router.include_router(projects.router)
api_router.include_router(admin.router)
api_router.include_router(ask.router)
api_router.include_router(insights.router)
