"""Embedded retrieval chunks for the /ask endpoint (pgvector).

Chunks are derived data: content_items bodies split by heading, and projects
serialized to one synthetic document each. `services/rag/indexer` rebuilds
them incrementally by checksum. Populated and queried only on Postgres; the
table exists on SQLite (tests) but stays empty — retrieval there uses the
keyword MockRetriever.
"""
from __future__ import annotations

from datetime import UTC, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.services.ai.base import EMBEDDING_DIM

SOURCE_TYPES = ("content", "project")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ContentChunk(Base):
    __tablename__ = "content_chunks"
    __table_args__ = (
        UniqueConstraint("source_type", "source_key", "chunk_index", name="uq_chunk_source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # One of SOURCE_TYPES.
    source_type: Mapped[str] = mapped_column(String(16), index=True)
    # content_items.slug or str(projects.id).
    source_key: Mapped[str] = mapped_column(String(160), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    # Denormalized for citations without a join.
    title: Mapped[str] = mapped_column(String(256), default="")
    # Content kind ('playbook', 'prompt', ...) or 'project'.
    kind: Mapped[str] = mapped_column(String(16), default="")
    heading: Mapped[str] = mapped_column(String(256), default="")
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(Vector(EMBEDDING_DIM))
    # sha256 of the SOURCE at index time (all chunks of a source share it);
    # unchanged checksum => skip re-embedding.
    checksum: Mapped[str] = mapped_column(String(64), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
