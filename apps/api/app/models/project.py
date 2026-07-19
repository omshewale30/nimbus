"""AI project inventory: pilots, experiments, and use cases across F&O.

Unlike content_items (mirrored from git), projects are DB-native and edited at
runtime: staff submit proposals through the intake form (status `proposed`) and
editors triage/maintain them. Status values are validated in the Pydantic
schemas (StrEnum), not as a DB enum, so adding one is a code change only.
"""
from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import JSON, Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

VALID_STATUSES = ("proposed", "idea", "pilot", "active", "paused", "done", "rejected")
# Origin of the record: staff intake vs editor-inventoried existing project.
# Immutable after creation (no API path changes it).
VALID_SOURCES = ("proposed", "inventoried")

# JSONB on Postgres, plain JSON elsewhere (SQLite in tests).
_JsonCol = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    department: Mapped[str] = mapped_column(String(128), index=True, default="")
    owner_email: Mapped[str] = mapped_column(String(256), default="")
    sponsor: Mapped[str] = mapped_column(String(256), default="")
    # One of VALID_STATUSES.
    status: Mapped[str] = mapped_column(String(16), index=True, default="proposed")
    # One of VALID_SOURCES.
    source: Mapped[str] = mapped_column(String(16), index=True, default="proposed")
    # The problem / use case in plain language.
    summary: Mapped[str] = mapped_column(Text, default="")
    business_value: Mapped[str] = mapped_column(Text, default="")
    risks: Mapped[str] = mapped_column(Text, default="")
    dependencies: Mapped[str] = mapped_column(Text, default="")
    next_steps: Mapped[str] = mapped_column(Text, default="")
    # Editor note explaining a triage decision; required when rejecting.
    triage_note: Mapped[str] = mapped_column(Text, default="")
    tools_used: Mapped[list] = mapped_column(_JsonCol, default=list)
    # Cross-links into content_items (e.g. the playbook a pilot produced).
    related_slugs: Mapped[list] = mapped_column(_JsonCol, default=list)
    stakeholders: Mapped[list] = mapped_column(_JsonCol, default=list)
    strategic_category: Mapped[str] = mapped_column(String(128), default="")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    submitted_by: Mapped[str] = mapped_column(String(256), default="")
    last_updated_by: Mapped[str] = mapped_column(String(256), default="")
    # Soft archive: archived rows are hidden from default list views.
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    archived_by: Mapped[str] = mapped_column(String(256), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
