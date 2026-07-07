"""content_items: git-authored playbooks, tool registry, and guidance

Revision ID: 0002_content_items
Revises: 0001_initial
Create Date: 2026-07-07
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0002_content_items"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

_json = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "content_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("tags", _json, nullable=False),
        sa.Column("attributes", _json, nullable=False),
        sa.Column("related_slugs", _json, nullable=False),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("source_path", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("checksum", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_items_slug", "content_items", ["slug"], unique=True)
    op.create_index("ix_content_items_kind", "content_items", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_content_items_kind", table_name="content_items")
    op.drop_index("ix_content_items_slug", table_name="content_items")
    op.drop_table("content_items")
