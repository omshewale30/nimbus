"""Lightweight usage events for content (prompt copies, page views).

Append-only, one row per event. Powers the leadership metrics (top copied
prompts, views over time) without any per-user tracking: the actor is stored
as an opaque hash so counts can be deduplicated but not attributed.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

VALID_EVENT_TYPES = ("copy", "view")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ContentEvent(Base):
    __tablename__ = "content_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Slug rather than FK: content rows are replaced by the git sync, and the
    # slug is the stable identity we report metrics against.
    content_slug: Mapped[str] = mapped_column(String(160), index=True)
    # One of VALID_EVENT_TYPES.
    event_type: Mapped[str] = mapped_column(String(16), index=True)
    # sha256 of the principal subject — dedupable, not attributable.
    user_hash: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
