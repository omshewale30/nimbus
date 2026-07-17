"""Service for recording content usage events (copies, views).

Mirrors the shape of `services.audit`: module-level function, caller commits.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.content_event import ContentEvent


def record_content_event(
    db: Session,
    *,
    slug: str,
    event_type: str,
    user_hash: str = "",
) -> ContentEvent:
    """Append a usage event. The caller's transaction commits it."""
    event = ContentEvent(content_slug=slug, event_type=event_type, user_hash=user_hash)
    db.add(event)
    db.flush()  # assign PK without ending the request transaction
    return event
