"""projects: AI project inventory + intake proposals

Revision ID: 0005_projects
Revises: 0004_content_events
Create Date: 2026-07-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005_projects"
down_revision = "0004_content_events"
branch_labels = None
depends_on = None

_json = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("department", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("owner_email", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("sponsor", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="proposed"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("business_value", sa.Text(), nullable=False, server_default=""),
        sa.Column("risks", sa.Text(), nullable=False, server_default=""),
        sa.Column("dependencies", sa.Text(), nullable=False, server_default=""),
        sa.Column("next_steps", sa.Text(), nullable=False, server_default=""),
        sa.Column("triage_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("tools_used", _json, nullable=False),
        sa.Column("related_slugs", _json, nullable=False),
        sa.Column("submitted_by", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("last_updated_by", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_department", "projects", ["department"])


def downgrade() -> None:
    op.drop_index("ix_projects_department", table_name="projects")
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_table("projects")
