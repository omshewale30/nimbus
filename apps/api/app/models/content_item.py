"""Curated content: playbooks, tool-registry entries, and risk guidance.

One table for all three kinds — browse pages filter by `kind`, and the ask
endpoint retrieves across all kinds at once. Rows are never edited at runtime:
they mirror the markdown files under `apps/api/content/` (git is the source of
truth), synced by `app.services.content_sync`.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

VALID_KINDS = ("playbook", "tool", "guidance")

# JSONB on Postgres, plain JSON elsewhere (SQLite in tests).
_JsonCol = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    # One of VALID_KINDS.
    kind: Mapped[str] = mapped_column(String(16), index=True)
    title: Mapped[str] = mapped_column(String(256))
    # Short description shown on cards and fed to the ask catalog prompt.
    summary: Mapped[str] = mapped_column(Text)
    body_md: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(_JsonCol, default=list)
    # Kind-specific fields; tools carry {status, owner_dept, owner_contact, url}.
    attributes: Mapped[dict] = mapped_column(_JsonCol, default=dict)
    # Hand-curated cross-links by slug (e.g. playbook -> guidance).
    related_slugs: Mapped[list] = mapped_column(_JsonCol, default=list)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    # Sync provenance: path relative to the content dir + sha256 of the file.
    source_path: Mapped[str] = mapped_column(String(512), default="")
    checksum: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
