"""Import all models so they register on `Base.metadata`."""
from app.models.audit_event import AuditEvent
from app.models.content_event import ContentEvent
from app.models.content_item import ContentItem
from app.models.project import Project

__all__ = ["AuditEvent", "ContentEvent", "ContentItem", "Project"]
