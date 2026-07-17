"""Tests for GET /insights/summary."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.models.audit_event import AuditEvent
from app.models.content_event import ContentEvent
from app.models.content_item import ContentItem
from app.models.project import Project

_OLD = datetime.now(UTC) - timedelta(days=45)


@pytest.fixture
def insights_data(db_session):
    rows = [
        ContentItem(
            slug="guide-a", kind="playbook", title="Guide A", summary="s",
            tags=[], attributes={}, related_slugs=[],
        ),
        ContentItem(
            slug="guide-b", kind="guidance", title="Guide B", summary="s",
            tags=[], attributes={}, related_slugs=[],
        ),
        ContentItem(
            slug="prompt-a", kind="prompt", title="Prompt A", summary="s",
            tags=[], attributes={}, related_slugs=[],
        ),
        ContentItem(
            slug="hidden", kind="prompt", title="Hidden", summary="s",
            tags=[], attributes={}, related_slugs=[], published=False,
        ),
        Project(name="P1", status="proposed", tools_used=[], related_slugs=[]),
        Project(name="P2", status="active", tools_used=[], related_slugs=[]),
        Project(name="P3", status="active", tools_used=[], related_slugs=[]),
        # Recent activity (inside the 30d window).
        AuditEvent(action="project.intake", actor_subject="u1"),
        AuditEvent(action="ask.completed", actor_subject="u1"),
        AuditEvent(action="ask.completed", actor_subject="u2"),
        ContentEvent(content_slug="prompt-a", event_type="copy"),
        ContentEvent(content_slug="prompt-a", event_type="copy"),
        ContentEvent(content_slug="guide-a", event_type="copy"),
        ContentEvent(content_slug="prompt-a", event_type="view"),
        # Old activity (outside the window) — must not be counted.
        AuditEvent(action="project.intake", actor_subject="u1", created_at=_OLD),
        AuditEvent(action="ask.completed", actor_subject="u1", created_at=_OLD),
        ContentEvent(content_slug="prompt-a", event_type="copy", created_at=_OLD),
    ]
    db_session.add_all(rows)
    db_session.commit()
    yield rows
    for row in rows:
        db_session.delete(row)
    db_session.commit()


def test_summary_aggregates(client, insights_data):
    resp = client.get("/api/v1/insights/summary")
    assert resp.status_code == 200
    body = resp.json()

    # Unpublished content is excluded; guides = playbook+guidance+tool.
    assert body["publishedGuides"] == 2
    assert body["publishedPrompts"] == 1

    assert body["projectsTotal"] == 3
    assert body["projectsByStatus"]["proposed"] == 1
    assert body["projectsByStatus"]["active"] == 2
    # Zero-filled statuses are always present.
    assert body["projectsByStatus"]["rejected"] == 0
    assert len(body["projectsByStatus"]) == 7

    # 30-day window: old rows excluded; views are not copies.
    assert body["intakesLast30d"] == 1
    assert body["asksLast30d"] == 2
    assert body["copiesLast30d"] == 3
    assert body["windowDays"] == 30

    assert body["topCopied"][0] == {"slug": "prompt-a", "title": "Prompt A", "copies": 2}
    assert body["topCopied"][1] == {"slug": "guide-a", "title": "Guide A", "copies": 1}


def test_summary_empty_db(client):
    resp = client.get("/api/v1/insights/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["publishedGuides"] == 0
    assert body["projectsTotal"] == 0
    assert body["topCopied"] == []
    assert body["projectsByStatus"]["active"] == 0
