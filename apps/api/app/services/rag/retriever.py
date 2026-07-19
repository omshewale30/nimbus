"""Retrieval backends for /ask.

Postgres uses pgvector over `content_chunks`. SQLite/tests use a deterministic
keyword fallback over the source tables so the route remains fully testable
without a vector extension.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.content_chunk import ContentChunk
from app.models.content_item import ContentItem
from app.models.project import Project
from app.services.ai.base import AIProvider
from app.services.rag.indexer import project_document

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_PGVECTOR_SIMILARITY_FLOOR = 0.15


@dataclass(frozen=True)
class RetrievedSource:
    source_type: str
    source_key: str
    title: str
    kind: str
    heading: str
    text: str
    score: float = 0.0

    @property
    def ref(self) -> str:
        """Backward-compatible slug/id accessor used by older tests."""
        return self.source_key


class Retriever(Protocol):
    async def search(self, db: Session, query: str, k: int = 6) -> list[RetrievedSource]:
        """Return ranked context sources for a user question."""
        ...


def _tokens(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _token_set(text: str) -> set[str]:
    return set(_tokens(text))


def _keyword_score(query_tokens: set[str], document_tokens: set[str]) -> float:
    if not query_tokens or not document_tokens:
        return 0.0
    overlap = len(query_tokens & document_tokens)
    if overlap == 0:
        return 0.0
    return overlap / math.sqrt(len(query_tokens) * len(document_tokens))


class PgVectorRetriever:
    def __init__(
        self,
        provider: AIProvider,
        *,
        similarity_floor: float = _PGVECTOR_SIMILARITY_FLOOR,
    ):
        self._provider = provider
        self._similarity_floor = similarity_floor

    async def search(self, db: Session, query: str, k: int = 6) -> list[RetrievedSource]:
        [query_embedding] = await self._provider.embed([query])
        distance = ContentChunk.embedding.cosine_distance(query_embedding)
        rows = db.execute(
            select(ContentChunk, distance.label("distance"))
            .order_by(distance)
            .limit(max(k * 3, k))
        ).all()

        results: list[RetrievedSource] = []
        for chunk, raw_distance in rows:
            similarity = 1.0 - float(raw_distance)
            if similarity < self._similarity_floor:
                continue
            results.append(
                RetrievedSource(
                    source_type=chunk.source_type,
                    source_key=chunk.source_key,
                    title=chunk.title,
                    kind=chunk.kind,
                    heading=chunk.heading,
                    text=chunk.text,
                    score=similarity,
                )
            )
            if len(results) >= k:
                break
        return results


class MockRetriever:
    async def search(self, db: Session, query: str, k: int = 6) -> list[RetrievedSource]:
        query_tokens = _token_set(query)
        if not query_tokens:
            return []

        results: list[RetrievedSource] = []

        items = db.execute(
            select(ContentItem).where(ContentItem.published.is_(True))
        ).scalars().all()
        for item in items:
            searchable = "\n".join(
                [
                    item.title,
                    item.kind,
                    item.summary,
                    item.body_md,
                    " ".join(item.tags or []),
                    " ".join(str(value) for value in (item.attributes or {}).values()),
                ]
            )
            score = _keyword_score(query_tokens, _token_set(searchable))
            if score <= 0:
                continue
            results.append(
                RetrievedSource(
                    source_type="content",
                    source_key=item.slug,
                    title=item.title,
                    kind=item.kind,
                    heading="",
                    text=searchable,
                    score=score,
                )
            )

        projects = db.execute(
            select(Project).where(Project.archived_at.is_(None))
        ).scalars().all()
        for row in projects:
            doc = project_document(row)
            score = _keyword_score(query_tokens, _token_set(doc))
            if score <= 0:
                continue
            results.append(
                RetrievedSource(
                    source_type="project",
                    source_key=str(row.id),
                    title=row.name,
                    kind="project",
                    heading="",
                    text=doc,
                    score=score,
                )
            )

        results.sort(key=lambda r: (-r.score, r.source_type, r.title.lower(), r.source_key))
        return results[:k]


def get_retriever(db: Session, provider: AIProvider) -> Retriever:
    if db.get_bind().dialect.name == "postgresql":
        return PgVectorRetriever(provider)
    return MockRetriever()
