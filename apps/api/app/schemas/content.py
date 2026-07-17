"""Content browse/read schemas (guides, prompts, tools, guidance)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ContentSummary(BaseModel):
    """Card-level view returned by the list endpoint."""

    slug: str
    kind: str
    title: str
    summary: str
    tags: list[str]
    # Kind-specific fields (prompt text, audience, tool owner, ...).
    attributes: dict
    featured: bool
    updatedAt: datetime


class RelatedItem(BaseModel):
    """Resolved cross-link, enough to render a link card."""

    slug: str
    kind: str
    title: str


class ContentDetail(ContentSummary):
    bodyMd: str
    related: list[RelatedItem]


class ContentListResponse(BaseModel):
    items: list[ContentSummary]
    total: int


class ContentEventRequest(BaseModel):
    eventType: Literal["copy", "view"]


class ContentEventResponse(BaseModel):
    status: str = Field(default="recorded", examples=["recorded"])
