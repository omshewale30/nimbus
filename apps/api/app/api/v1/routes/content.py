"""/api/v1/content — browse and read git-authored content.

Read-only: rows are mirrored from markdown by the content sync, so there are
no create/update endpoints. The only write is the usage-event endpoint
(prompt copies, views) that powers leadership metrics.
"""
from __future__ import annotations

import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.content_item import VALID_KINDS, ContentItem
from app.schemas.common import ErrorResponse
from app.schemas.content import (
    ContentDetail,
    ContentEventRequest,
    ContentEventResponse,
    ContentListResponse,
    ContentSummary,
    RelatedItem,
)
from app.services.content_events import record_content_event
from app.services.identity.current_user import CurrentUser

router = APIRouter(tags=["content"])

CONTENT_ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing or invalid bearer token."},
    404: {"model": ErrorResponse, "description": "No published content with that slug."},
    422: {"model": ErrorResponse, "description": "Request validation failed."},
}

_DbDep = Annotated[Session, Depends(get_db)]


def _summary(row: ContentItem) -> ContentSummary:
    return ContentSummary(
        slug=row.slug,
        kind=row.kind,
        title=row.title,
        summary=row.summary,
        tags=row.tags,
        attributes=row.attributes,
        featured=row.featured,
        updatedAt=row.updated_at,
    )


def _get_published(db: Session, slug: str) -> ContentItem:
    row = db.execute(
        select(ContentItem).where(ContentItem.slug == slug, ContentItem.published.is_(True))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"No content with slug '{slug}'")
    return row


@router.get("/content", response_model=ContentListResponse, responses=CONTENT_ERROR_RESPONSES)
def list_content(
    user: CurrentUser,
    db: _DbDep,
    kind: Annotated[str | None, Query(description=f"One of: {', '.join(VALID_KINDS)}")] = None,
    tag: Annotated[str | None, Query(description="Exact tag match.")] = None,
    q: Annotated[str | None, Query(max_length=200, description="Keyword filter.")] = None,
) -> ContentListResponse:
    if kind is not None and kind not in VALID_KINDS:
        raise HTTPException(
            status_code=422, detail=f"kind must be one of: {', '.join(VALID_KINDS)}"
        )

    stmt = select(ContentItem).where(ContentItem.published.is_(True))
    if kind is not None:
        stmt = stmt.where(ContentItem.kind == kind)
    stmt = stmt.order_by(ContentItem.featured.desc(), ContentItem.title)
    rows = list(db.execute(stmt).scalars())

    # Tag/keyword filtering happens in Python: tags live in a JSON column and
    # the corpus is small (hundreds of rows), so this beats dialect-specific
    # JSON operators and keeps SQLite (tests) and Postgres identical.
    if tag is not None:
        rows = [r for r in rows if tag in r.tags]
    if q is not None and q.strip():
        needle = q.strip().lower()
        rows = [
            r
            for r in rows
            if needle in r.title.lower()
            or needle in r.summary.lower()
            or needle in r.body_md.lower()
        ]

    return ContentListResponse(items=[_summary(r) for r in rows], total=len(rows))


@router.get(
    "/content/{slug}", response_model=ContentDetail, responses=CONTENT_ERROR_RESPONSES
)
def get_content(user: CurrentUser, db: _DbDep, slug: str) -> ContentDetail:
    row = _get_published(db, slug)

    related_rows = []
    if row.related_slugs:
        related_rows = list(
            db.execute(
                select(ContentItem).where(
                    ContentItem.slug.in_(row.related_slugs), ContentItem.published.is_(True)
                )
            ).scalars()
        )
        # Preserve the hand-curated order from frontmatter.
        by_slug = {r.slug: r for r in related_rows}
        related_rows = [by_slug[s] for s in row.related_slugs if s in by_slug]

    return ContentDetail(
        **_summary(row).model_dump(),
        bodyMd=row.body_md,
        related=[RelatedItem(slug=r.slug, kind=r.kind, title=r.title) for r in related_rows],
    )


@router.post(
    "/content/{slug}/events",
    response_model=ContentEventResponse,
    responses=CONTENT_ERROR_RESPONSES,
)
def record_event_for_content(
    user: CurrentUser,
    db: _DbDep,
    slug: str,
    payload: ContentEventRequest,
) -> ContentEventResponse:
    row = _get_published(db, slug)
    user_hash = hashlib.sha256(user.subject.encode("utf-8")).hexdigest()
    record_content_event(db, slug=row.slug, event_type=payload.eventType, user_hash=user_hash)
    return ContentEventResponse()
