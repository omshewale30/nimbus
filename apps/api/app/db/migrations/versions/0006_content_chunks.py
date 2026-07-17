"""content_chunks: pgvector-embedded retrieval chunks for /ask

Revision ID: 0006_content_chunks
Revises: 0005_projects
Create Date: 2026-07-17
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision = "0006_content_chunks"
down_revision = "0005_projects"
branch_labels = None
depends_on = None

_EMBEDDING_DIM = 1536  # keep in sync with app.services.ai.base.EMBEDDING_DIM


def upgrade() -> None:
    op.create_table(
        "content_chunks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("source_key", sa.String(length=160), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default=""),
        sa.Column("heading", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(_EMBEDDING_DIM), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_type", "source_key", "chunk_index", name="uq_chunk_source"),
    )
    op.create_index("ix_content_chunks_source_type", "content_chunks", ["source_type"])
    op.create_index("ix_content_chunks_source_key", "content_chunks", ["source_key"])
    # The ANN index only exists on Postgres; SQLite (tests) never queries here.
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "CREATE INDEX ix_content_chunks_embedding ON content_chunks "
            "USING hnsw (embedding vector_cosine_ops)"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_content_chunks_embedding")
    op.drop_index("ix_content_chunks_source_key", table_name="content_chunks")
    op.drop_index("ix_content_chunks_source_type", table_name="content_chunks")
    op.drop_table("content_chunks")
