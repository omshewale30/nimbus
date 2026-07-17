"""Tests for /api/v1/projects: intake, triage, and the editor permission matrix."""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import Principal
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.project import Project
from app.services.identity.current_user import get_current_user

INTAKE_PAYLOAD = {
    "name": "Invoice triage pilot",
    "department": "Finance",
    "summary": "Use AI to sort incoming invoices by type and urgency.",
    "businessValue": "Saves ~4 hours/week in AP.",
    "toolsUsed": ["Microsoft 365 Copilot"],
}


@pytest.fixture(autouse=True)
def clean_tables(db_session):
    for model in (Project, AuditEvent):
        db_session.query(model).delete()
    db_session.commit()
    yield


@pytest.fixture
def as_regular_user(client):
    """A real-looking (non-dev) principal whose email is NOT in EDITOR_EMAILS."""
    app.dependency_overrides[get_current_user] = lambda: Principal(
        subject="u-123", name="Regular Staff", email="staff@example.com"
    )
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def as_email_editor(client):
    """A non-dev principal authorized via the EDITOR_EMAILS allowlist."""
    app.dependency_overrides[get_current_user] = lambda: Principal(
        subject="u-456", name="Ed Itor", email="Editor@Example.com"
    )
    settings = get_settings().model_copy(update={"editor_emails": "editor@example.com"})
    app.dependency_overrides[get_settings] = lambda: settings
    yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_settings, None)


def test_intake_lands_as_proposed_with_audit(client, as_regular_user, db_session):
    resp = client.post("/api/v1/projects/intake", json=INTAKE_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "proposed"
    assert body["submittedBy"] == "staff@example.com"

    audit = list(db_session.execute(select(AuditEvent)).scalars())
    assert [a.action for a in audit] == ["project.intake"]
    assert f"project_id={body['id']}" in audit[0].detail


def test_regular_user_cannot_create_or_patch(client, as_regular_user):
    assert client.post("/api/v1/projects", json={"name": "Direct create"}).status_code == 403
    assert client.patch("/api/v1/projects/1", json={"summary": "x"}).status_code == 403


def test_dev_principal_is_editor(client):
    resp = client.post("/api/v1/projects", json={"name": "Editor create", "status": "idea"})
    assert resp.status_code == 201
    assert resp.json()["status"] == "idea"


def test_email_allowlist_editor_can_triage(client, as_email_editor, db_session):
    created = client.post("/api/v1/projects", json={"name": "Allowlist create"}).json()
    resp = client.patch(f"/api/v1/projects/{created['id']}", json={"status": "pilot"})
    assert resp.status_code == 200
    assert resp.json()["lastUpdatedBy"] == "Editor@Example.com"

    actions = [a.action for a in db_session.execute(select(AuditEvent)).scalars()]
    assert "project.status_changed" in actions


def test_status_transition_is_audited(client, db_session):
    created = client.post("/api/v1/projects", json={"name": "Pilot", "status": "idea"}).json()
    client.patch(f"/api/v1/projects/{created['id']}", json={"status": "active"})

    events = [
        a
        for a in db_session.execute(select(AuditEvent)).scalars()
        if a.action == "project.status_changed"
    ]
    assert len(events) == 1
    assert "idea->active" in events[0].detail


def test_reject_requires_triage_note(client):
    created = client.post("/api/v1/projects", json={"name": "To reject"}).json()
    pid = created["id"]

    no_note = client.patch(f"/api/v1/projects/{pid}", json={"status": "rejected"})
    assert no_note.status_code == 422

    with_note = client.patch(
        f"/api/v1/projects/{pid}",
        json={"status": "rejected", "triageNote": "Duplicate of the AP pilot."},
    )
    assert with_note.status_code == 200
    assert with_note.json()["triageNote"] == "Duplicate of the AP pilot."


def test_list_filters_and_validation(client):
    client.post("/api/v1/projects", json={"name": "Fin idea", "department": "Finance"})
    client.post(
        "/api/v1/projects",
        json={"name": "Ops pilot", "department": "Operations", "status": "pilot"},
    )

    by_status = client.get("/api/v1/projects", params={"status": "pilot"}).json()
    assert [p["name"] for p in by_status["items"]] == ["Ops pilot"]

    by_dept = client.get("/api/v1/projects", params={"department": "Finance"}).json()
    assert [p["name"] for p in by_dept["items"]] == ["Fin idea"]

    assert client.get("/api/v1/projects", params={"status": "bogus"}).status_code == 422


def test_get_missing_project_404(client):
    assert client.get("/api/v1/projects/9999").status_code == 404


def test_me_reports_editor_flag(client, as_regular_user):
    assert client.get("/api/v1/me").json()["isEditor"] is False


def test_me_editor_flag_for_dev_principal(client):
    assert client.get("/api/v1/me").json()["isEditor"] is True
