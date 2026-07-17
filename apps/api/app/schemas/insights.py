"""/insights response schemas — leadership usage metrics."""
from __future__ import annotations

from pydantic import BaseModel


class TopCopiedItem(BaseModel):
    slug: str
    title: str
    copies: int


class InsightsSummary(BaseModel):
    """SQL aggregates over existing tables; no dedicated metrics storage."""

    # Published content counts. "Guides" = every non-prompt kind
    # (playbook, guidance, tool), matching how the UI groups them.
    publishedGuides: int
    publishedPrompts: int
    # All seven statuses are always present (zero-filled), in canonical order.
    projectsTotal: int
    projectsByStatus: dict[str, int]
    # Activity inside the trailing window (windowDays).
    intakesLast30d: int
    copiesLast30d: int
    asksLast30d: int
    topCopied: list[TopCopiedItem]
    windowDays: int = 30
