"""/api/v1/insights — lightweight usage metrics for leadership.

Read-only SQL aggregates over tables that already exist (content_items,
projects, content_events, audit_events). No new storage, no per-user
reporting: counts only.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.content_event import ContentEvent
from app.models.content_item import ContentItem
from app.models.project import Project
from app.schemas.common import ErrorResponse
from app.schemas.insights import InsightsSummary, TopCopiedItem
from app.schemas.project import ProjectStatus
from app.services.identity.current_user import CurrentUser

router = APIRouter(prefix="/insights", tags=["insights"])

INSIGHTS_ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing or invalid bearer token."},
    500: {"model": ErrorResponse, "description": "Unexpected server error."},
}

_DbDep = Annotated[Session, Depends(get_db)]

WINDOW_DAYS = 30
TOP_COPIED_LIMIT = 5


def _count_since(db: Session, column_filter, created_at, cutoff: datetime) -> int:
    return db.execute(
        select(func.count()).where(column_filter, created_at >= cutoff)
    ).scalar_one()


@router.get(
    "/summary", response_model=InsightsSummary, responses=INSIGHTS_ERROR_RESPONSES
)
def insights_summary(user: CurrentUser, db: _DbDep) -> InsightsSummary:
    cutoff = datetime.now(UTC) - timedelta(days=WINDOW_DAYS)

    kind_counts = dict(
        db.execute(
            select(ContentItem.kind, func.count())
            .where(ContentItem.published.is_(True))
            .group_by(ContentItem.kind)
        ).all()
    )
    published_prompts = kind_counts.pop("prompt", 0)
    published_guides = sum(kind_counts.values())

    status_counts = dict(
        db.execute(select(Project.status, func.count()).group_by(Project.status)).all()
    )
    projects_by_status = {s.value: status_counts.get(s.value, 0) for s in ProjectStatus}

    copy_filter = ContentEvent.event_type == "copy"
    copies_last_30d = _count_since(db, copy_filter, ContentEvent.created_at, cutoff)
    top_rows = db.execute(
        select(ContentEvent.content_slug, func.count().label("copies"))
        .where(copy_filter, ContentEvent.created_at >= cutoff)
        .group_by(ContentEvent.content_slug)
        .order_by(func.count().desc(), ContentEvent.content_slug)
        .limit(TOP_COPIED_LIMIT)
    ).all()
    titles = {}
    if top_rows:
        titles = dict(
            db.execute(
                select(ContentItem.slug, ContentItem.title).where(
                    ContentItem.slug.in_([slug for slug, _ in top_rows])
                )
            ).all()
        )

    return InsightsSummary(
        publishedGuides=published_guides,
        publishedPrompts=published_prompts,
        projectsTotal=sum(projects_by_status.values()),
        projectsByStatus=projects_by_status,
        intakesLast30d=_count_since(
            db, AuditEvent.action == "project.intake", AuditEvent.created_at, cutoff
        ),
        copiesLast30d=copies_last_30d,
        asksLast30d=_count_since(
            db, AuditEvent.action == "ask.completed", AuditEvent.created_at, cutoff
        ),
        topCopied=[
            TopCopiedItem(slug=slug, title=titles.get(slug, slug), copies=copies)
            for slug, copies in top_rows
        ],
        windowDays=WINDOW_DAYS,
    )
