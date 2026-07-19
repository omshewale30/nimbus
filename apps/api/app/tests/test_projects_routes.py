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

INVENTORY_PAYLOAD = {
    "name": "Travel reimbursement automation",
    "department": "Finance",
    "ownerEmail": "owner@unc.edu",
    "sponsor": "AVC Finance",
    "stakeholders": ["Travel Services", "Internal Audit"],
    "summary": "In-flight RPA project automating travel reimbursement checks.",
    "strategicCategory": "automation",
    "startDate": "2026-01-15",
    "targetDate": "2026-09-30",
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
    assert body["source"] == "proposed"
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


def test_inventory_creates_inventoried_project(client, as_email_editor, db_session):
    resp = client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["source"] == "inventoried"
    assert body["status"] == "active"  # default for inventoried work
    assert body["stakeholders"] == ["Travel Services", "Internal Audit"]
    assert body["strategicCategory"] == "automation"
    assert body["startDate"] == "2026-01-15"
    assert body["archivedAt"] is None

    actions = [a.action for a in db_session.execute(select(AuditEvent)).scalars()]
    assert actions == ["project.inventoried"]


def test_regular_user_cannot_inventory_archive_or_delete(client, as_regular_user):
    assert client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD).status_code == 403
    assert client.post("/api/v1/projects/1/archive").status_code == 403
    assert client.post("/api/v1/projects/1/unarchive").status_code == 403
    assert client.delete("/api/v1/projects/1").status_code == 403


def test_inventory_rejects_target_before_start(client):
    bad = {**INVENTORY_PAYLOAD, "startDate": "2026-09-30", "targetDate": "2026-01-15"}
    assert client.post("/api/v1/projects/inventory", json=bad).status_code == 422


def test_patch_supports_registry_fields(client):
    created = client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD).json()
    resp = client.patch(
        f"/api/v1/projects/{created['id']}",
        json={"strategicCategory": "analytics", "stakeholders": ["Budget Office"]},
    )
    assert resp.status_code == 200
    assert resp.json()["strategicCategory"] == "analytics"
    assert resp.json()["stakeholders"] == ["Budget Office"]
    # source is not patchable: unknown fields are ignored by the schema
    resp = client.patch(f"/api/v1/projects/{created['id']}", json={"source": "proposed"})
    assert resp.json()["source"] == "inventoried"


def test_archive_hides_from_default_list(client, db_session):
    created = client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD).json()
    pid = created["id"]

    archived = client.post(f"/api/v1/projects/{pid}/archive")
    assert archived.status_code == 200
    assert archived.json()["archivedAt"] is not None
    assert archived.json()["archivedBy"] != ""

    default_list = client.get("/api/v1/projects").json()
    assert pid not in [p["id"] for p in default_list["items"]]

    with_archived = client.get("/api/v1/projects", params={"includeArchived": "true"}).json()
    assert pid in [p["id"] for p in with_archived["items"]]

    # still retrievable by id
    assert client.get(f"/api/v1/projects/{pid}").status_code == 200

    # archiving twice is a no-op: only one audit event
    client.post(f"/api/v1/projects/{pid}/archive")
    archive_events = [
        a
        for a in db_session.execute(select(AuditEvent)).scalars()
        if a.action == "project.archived"
    ]
    assert len(archive_events) == 1


def test_unarchive_restores_project(client, db_session):
    created = client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD).json()
    pid = created["id"]
    client.post(f"/api/v1/projects/{pid}/archive")

    resp = client.post(f"/api/v1/projects/{pid}/unarchive")
    assert resp.status_code == 200
    assert resp.json()["archivedAt"] is None
    assert resp.json()["archivedBy"] == ""

    assert pid in [p["id"] for p in client.get("/api/v1/projects").json()["items"]]
    actions = [a.action for a in db_session.execute(select(AuditEvent)).scalars()]
    assert "project.unarchived" in actions


def test_delete_removes_project_with_audit(client, db_session):
    created = client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD).json()
    pid = created["id"]

    resp = client.delete(f"/api/v1/projects/{pid}")
    assert resp.status_code == 204
    assert client.get(f"/api/v1/projects/{pid}").status_code == 404

    deleted = [
        a
        for a in db_session.execute(select(AuditEvent)).scalars()
        if a.action == "project.deleted"
    ]
    assert len(deleted) == 1
    assert f"project_id={pid}" in deleted[0].detail
    assert "Travel reimbursement automation" in deleted[0].detail

    assert client.delete("/api/v1/projects/9999").status_code == 404


def test_list_filters_by_source_and_q(client):
    client.post("/api/v1/projects/intake", json=INTAKE_PAYLOAD)
    client.post("/api/v1/projects/inventory", json=INVENTORY_PAYLOAD)

    inventoried = client.get("/api/v1/projects", params={"source": "inventoried"}).json()
    assert [p["name"] for p in inventoried["items"]] == ["Travel reimbursement automation"]

    proposed = client.get("/api/v1/projects", params={"source": "proposed"}).json()
    assert [p["name"] for p in proposed["items"]] == ["Invoice triage pilot"]

    by_q = client.get("/api/v1/projects", params={"q": "reimbursement"}).json()
    assert [p["name"] for p in by_q["items"]] == ["Travel reimbursement automation"]

    assert client.get("/api/v1/projects", params={"source": "bogus"}).status_code == 422


def test_me_reports_editor_flag(client, as_regular_user):
    assert client.get("/api/v1/me").json()["isEditor"] is False


def test_me_editor_flag_for_dev_principal(client):
    assert client.get("/api/v1/me").json()["isEditor"] is True
