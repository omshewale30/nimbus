"""Build and refresh the pgvector retrieval index (`content_chunks`).

Sources:
  - published `content_items`: the markdown body split by heading, each chunk
    prefixed with title/kind/tags so retrieval sees the context;
  - active `projects`: one synthetic document per non-archived row.

Indexing is incremental by checksum (same idea as `content_sync`): a source
whose checksum is unchanged is skipped; otherwise its chunks are deleted and
re-embedded. Runs at API startup (after the content sync), inline from the
projects routes, and manually via `python -m app.services.rag.indexer`
(`make reindex`). Postgres-only: on SQLite everything here no-ops and /ask
uses the keyword MockRetriever instead.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.content_chunk import ContentChunk
from app.models.content_item import ContentItem
from app.models.project import Project
from app.services.ai.base import AIProvider

logger = get_logger(__name__)

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
# Rough character budget per chunk (~600-700 tokens).
_MAX_CHUNK_CHARS = 2800


@dataclass
class Chunk:
    heading: str
    text: str


def _split_oversized(text: str) -> list[str]:
    """Split a section on paragraph boundaries so no piece exceeds the budget."""
    if len(text) <= _MAX_CHUNK_CHARS:
        return [text]
    pieces: list[str] = []
    current = ""
    for para in text.split("\n\n"):
        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) > _MAX_CHUNK_CHARS and current:
            pieces.append(current)
            current = para
        else:
            current = candidate
    if current:
        pieces.append(current)
    return pieces


def chunk_markdown(body_md: str) -> list[Chunk]:
    """Split a markdown body into heading-scoped chunks."""
    body = body_md.strip()
    if not body:
        return []

    matches = list(_HEADING_RE.finditer(body))
    sections: list[tuple[str, str]] = []
    if not matches:
        sections.append(("", body))
    else:
        if matches[0].start() > 0:
            sections.append(("", body[: matches[0].start()].strip()))
        for i, m in enumerate(matches):
            end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            sections.append((m.group(2).strip(), body[m.start() : end].strip()))

    chunks: list[Chunk] = []
    for heading, text in sections:
        if not text:
            continue
        for piece in _split_oversized(text):
            chunks.append(Chunk(heading=heading[:256], text=piece))
    return chunks


def _content_chunk_texts(item: ContentItem) -> list[Chunk]:
    """Chunks for a content item, each prefixed with identifying context."""
    prefix = f"{item.title} ({item.kind})"
    if item.tags:
        prefix += f"\nTags: {', '.join(item.tags)}"
    prefix += f"\nSummary: {item.summary}"

    chunks = chunk_markdown(item.body_md)
    if not chunks:
        chunks = [Chunk(heading="", text="")]
    return [Chunk(heading=c.heading, text=f"{prefix}\n\n{c.text}".strip()) for c in chunks]


def project_document(row: Project) -> str:
    """Serialize a project row into one retrievable document."""
    parts = [
        f"{row.name} (AI project, status: {row.status})",
        f"Department: {row.department}" if row.department else "",
        f"Owner: {row.owner_email}" if row.owner_email else "",
        f"Sponsor: {row.sponsor}" if row.sponsor else "",
        f"Summary: {row.summary}" if row.summary else "",
        f"Business value: {row.business_value}" if row.business_value else "",
        f"Risks: {row.risks}" if row.risks else "",
        f"Dependencies: {row.dependencies}" if row.dependencies else "",
        f"Next steps: {row.next_steps}" if row.next_steps else "",
        f"Tools used: {', '.join(row.tools_used)}" if row.tools_used else "",
    ]
    return "\n".join(p for p in parts if p)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _is_postgres(db: Session) -> bool:
    return db.get_bind().dialect.name == "postgresql"


def _existing_checksums(db: Session, source_type: str) -> dict[str, str]:
    rows = db.execute(
        select(ContentChunk.source_key, ContentChunk.checksum).where(
            ContentChunk.source_type == source_type
        )
    ).all()
    return {key: checksum for key, checksum in rows}


async def _replace_chunks(
    db: Session,
    provider: AIProvider,
    *,
    source_type: str,
    source_key: str,
    title: str,
    kind: str,
    chunks: list[Chunk],
    checksum: str,
) -> None:
    embeddings = await provider.embed([c.text for c in chunks])
    db.execute(
        delete(ContentChunk).where(
            ContentChunk.source_type == source_type,
            ContentChunk.source_key == source_key,
        )
    )
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
        db.add(
            ContentChunk(
                source_type=source_type,
                source_key=source_key,
                chunk_index=i,
                title=title[:256],
                kind=kind,
                heading=chunk.heading,
                text=chunk.text,
                embedding=embedding,
                checksum=checksum,
            )
        )
    db.flush()


def _delete_stale(db: Session, source_type: str, live_keys: set[str]) -> int:
    stale = [
        key
        for (key,) in db.execute(
            select(ContentChunk.source_key)
            .where(ContentChunk.source_type == source_type)
            .distinct()
        ).all()
        if key not in live_keys
    ]
    if stale:
        db.execute(
            delete(ContentChunk).where(
                ContentChunk.source_type == source_type,
                ContentChunk.source_key.in_(stale),
            )
        )
    return len(stale)


async def reindex_all(db: Session, provider: AIProvider) -> dict[str, int]:
    """Incrementally refresh the whole index. Caller commits."""
    if not _is_postgres(db):
        return {"skipped_non_postgres": 1}

    stats = {"indexed": 0, "unchanged": 0, "deleted_sources": 0}

    content_checksums = _existing_checksums(db, "content")
    items = db.execute(select(ContentItem).where(ContentItem.published.is_(True))).scalars().all()
    for item in items:
        if content_checksums.get(item.slug) == item.checksum:
            stats["unchanged"] += 1
            continue
        await _replace_chunks(
            db,
            provider,
            source_type="content",
            source_key=item.slug,
            title=item.title,
            kind=item.kind,
            chunks=_content_chunk_texts(item),
            checksum=item.checksum,
        )
        stats["indexed"] += 1
    stats["deleted_sources"] += _delete_stale(db, "content", {i.slug for i in items})

    project_checksums = _existing_checksums(db, "project")
    projects = db.execute(
        select(Project).where(Project.archived_at.is_(None))
    ).scalars().all()
    for row in projects:
        doc = project_document(row)
        checksum = _sha256(doc)
        if project_checksums.get(str(row.id)) == checksum:
            stats["unchanged"] += 1
            continue
        await _replace_chunks(
            db,
            provider,
            source_type="project",
            source_key=str(row.id),
            title=row.name,
            kind="project",
            chunks=[Chunk(heading="", text=doc)],
            checksum=checksum,
        )
        stats["indexed"] += 1
    stats["deleted_sources"] += _delete_stale(db, "project", {str(p.id) for p in projects})

    return stats


async def reindex_project(db: Session, provider: AIProvider, row: Project) -> None:
    """Refresh one project's chunks, or purge them when the project is archived."""
    if not _is_postgres(db):
        return
    if row.archived_at is not None:
        remove_project_chunks(db, row.id)
        return
    doc = project_document(row)
    await _replace_chunks(
        db,
        provider,
        source_type="project",
        source_key=str(row.id),
        title=row.name,
        kind="project",
        chunks=[Chunk(heading="", text=doc)],
        checksum=_sha256(doc),
    )


def remove_project_chunks(db: Session, project_id: int) -> None:
    """Drop one project's chunks (on archive/delete). No-op off Postgres."""
    if not _is_postgres(db):
        return
    db.execute(
        delete(ContentChunk).where(
            ContentChunk.source_type == "project",
            ContentChunk.source_key == str(project_id),
        )
    )


async def reindex_project_inline(db: Session, row: Project) -> None:
    """Best-effort inline refresh: never fail the write that triggered it."""
    from app.services.ai.factory import get_ai_provider

    try:
        await reindex_project(db, get_ai_provider(), row)
    except Exception:  # noqa: BLE001 — index freshness must not break saves
        logger.exception("Inline project reindex failed (project id=%s)", row.id)


def main() -> int:
    import asyncio

    from app.db.session import get_session_factory
    from app.services.ai.factory import get_ai_provider

    session = get_session_factory()()
    try:
        stats = asyncio.run(reindex_all(session, get_ai_provider()))
        session.commit()
    finally:
        session.close()
    print(f"reindex: {stats}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
