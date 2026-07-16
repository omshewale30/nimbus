"""pgvector: enable the vector extension for RAG embeddings

Postgres-only; a no-op on SQLite (tests). Requires the extension to be
available on the server: the local docker image is pgvector/pgvector:pg16,
and Azure Flexible Server allowlists it via azure.extensions=VECTOR
(infra/bicep/modules/postgres.bicep).

Revision ID: 0003_pgvector
Revises: 0002_content_items
Create Date: 2026-07-16
"""
from __future__ import annotations

from alembic import op

revision = "0003_pgvector"
down_revision = "0002_content_items"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    # Intentionally left in place: dropping the extension would cascade to any
    # vector columns created by later revisions.
    pass
