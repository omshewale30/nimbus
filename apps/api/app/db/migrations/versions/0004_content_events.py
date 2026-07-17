"""content_events: prompt copies and page views for usage metrics

Revision ID: 0004_content_events
Revises: 0003_pgvector
Create Date: 2026-07-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_content_events"
down_revision = "0003_pgvector"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("content_slug", sa.String(length=160), nullable=False),
        sa.Column("event_type", sa.String(length=16), nullable=False),
        sa.Column("user_hash", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_events_content_slug", "content_events", ["content_slug"])
    op.create_index("ix_content_events_event_type", "content_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_content_events_event_type", table_name="content_events")
    op.drop_index("ix_content_events_content_slug", table_name="content_events")
    op.drop_table("content_events")
