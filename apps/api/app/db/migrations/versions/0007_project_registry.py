"""project registry: source, archive state, and inventory metadata

Revision ID: 0007_project_registry
Revises: 0006_content_chunks
Create Date: 2026-07-18
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0007_project_registry"
down_revision = "0006_content_chunks"
branch_labels = None
depends_on = None

_json = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    # Every pre-existing row originated from intake/triage, so the
    # server_default 'proposed' is the correct backfill.
    op.add_column(
        "projects",
        sa.Column("source", sa.String(length=16), nullable=False, server_default="proposed"),
    )
    op.add_column(
        "projects",
        sa.Column("stakeholders", _json, nullable=False, server_default="[]"),
    )
    op.add_column(
        "projects",
        sa.Column(
            "strategic_category", sa.String(length=128), nullable=False, server_default=""
        ),
    )
    op.add_column("projects", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("projects", sa.Column("target_date", sa.Date(), nullable=True))
    op.add_column("projects", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "projects",
        sa.Column("archived_by", sa.String(length=256), nullable=False, server_default=""),
    )
    op.create_index("ix_projects_source", "projects", ["source"])


def downgrade() -> None:
    op.drop_index("ix_projects_source", table_name="projects")
    op.drop_column("projects", "archived_by")
    op.drop_column("projects", "archived_at")
    op.drop_column("projects", "target_date")
    op.drop_column("projects", "start_date")
    op.drop_column("projects", "strategic_category")
    op.drop_column("projects", "stakeholders")
    op.drop_column("projects", "source")
