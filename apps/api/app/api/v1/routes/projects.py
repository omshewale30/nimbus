"""/api/v1/projects — the AI project inventory and intake workflow.

Reading is open to all authenticated staff (leadership visibility is the
point). Writing splits two ways:
  - anyone can submit a proposal via /projects/intake (forced to `proposed`)
  - only editors (EDITOR_EMAILS allowlist) create/edit/triage records

Triage is not a workflow engine: it is a PATCH that changes `status`, with
every transition written to the audit trail.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.models.project import VALID_STATUSES, Project
from app.schemas.common import ErrorResponse
from app.schemas.project import (
    IntakeRequest,
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
)
from app.services.audit import record_event
from app.services.identity.current_user import CurrentUser, EditorUser

router = APIRouter(tags=["projects"])

PROJECT_ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing or invalid bearer token."},
    403: {"model": ErrorResponse, "description": "Editor access required."},
    404: {"model": ErrorResponse, "description": "No project with that id."},
    422: {"model": ErrorResponse, "description": "Request validation failed."},
}

_DbDep = Annotated[Session, Depends(get_db)]

# Pydantic camelCase field -> model column.
_FIELD_TO_COLUMN = {
    "name": "name",
    "department": "department",
    "ownerEmail": "owner_email",
    "sponsor": "sponsor",
    "status": "status",
    "summary": "summary",
    "businessValue": "business_value",
    "risks": "risks",
    "dependencies": "dependencies",
    "nextSteps": "next_steps",
    "triageNote": "triage_note",
    "toolsUsed": "tools_used",
    "relatedSlugs": "related_slugs",
}


def _response(row: Project) -> ProjectResponse:
    return ProjectResponse(
        id=row.id,
        name=row.name,
        department=row.department,
        ownerEmail=row.owner_email,
        sponsor=row.sponsor,
        status=ProjectStatus(row.status),
        summary=row.summary,
        businessValue=row.business_value,
        risks=row.risks,
        dependencies=row.dependencies,
        nextSteps=row.next_steps,
        triageNote=row.triage_note,
        toolsUsed=row.tools_used,
        relatedSlugs=row.related_slugs,
        submittedBy=row.submitted_by,
        lastUpdatedBy=row.last_updated_by,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def _get_project(db: Session, project_id: int) -> Project:
    row = db.get(Project, project_id)
    if row is None:
        raise NotFoundError(f"No project with id {project_id}")
    return row


@router.get("/projects", response_model=ProjectListResponse, responses=PROJECT_ERROR_RESPONSES)
def list_projects(
    user: CurrentUser,
    db: _DbDep,
    status: Annotated[
        str | None, Query(description=f"One of: {', '.join(VALID_STATUSES)}")
    ] = None,
    department: Annotated[str | None, Query(max_length=128)] = None,
) -> ProjectListResponse:
    if status is not None and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422, detail=f"status must be one of: {', '.join(VALID_STATUSES)}"
        )

    stmt = select(Project).order_by(Project.updated_at.desc())
    if status is not None:
        stmt = stmt.where(Project.status == status)
    if department is not None:
        stmt = stmt.where(Project.department == department)
    rows = list(db.execute(stmt).scalars())
    return ProjectListResponse(items=[_response(r) for r in rows], total=len(rows))


@router.get(
    "/projects/{project_id}", response_model=ProjectResponse, responses=PROJECT_ERROR_RESPONSES
)
def get_project(user: CurrentUser, db: _DbDep, project_id: int) -> ProjectResponse:
    return _response(_get_project(db, project_id))


@router.post(
    "/projects/intake",
    response_model=ProjectResponse,
    status_code=201,
    responses=PROJECT_ERROR_RESPONSES,
)
def submit_intake(user: CurrentUser, db: _DbDep, payload: IntakeRequest) -> ProjectResponse:
    """Staff-facing proposal: always lands as `proposed` for editor triage."""
    row = Project(
        name=payload.name,
        department=payload.department,
        status=ProjectStatus.proposed.value,
        summary=payload.summary,
        business_value=payload.businessValue,
        risks=payload.risks,
        tools_used=payload.toolsUsed,
        related_slugs=[],
        submitted_by=user.email,
        last_updated_by=user.email,
    )
    db.add(row)
    db.flush()
    record_event(db, action="project.intake", actor=user, detail=f"project_id={row.id}")
    return _response(row)


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=201,
    responses=PROJECT_ERROR_RESPONSES,
)
def create_project(user: EditorUser, db: _DbDep, payload: ProjectCreate) -> ProjectResponse:
    row = Project(
        **{
            _FIELD_TO_COLUMN[f]: (v.value if isinstance(v, ProjectStatus) else v)
            for f, v in payload.model_dump().items()
        },
        submitted_by=user.email,
        last_updated_by=user.email,
    )
    db.add(row)
    db.flush()
    record_event(db, action="project.created", actor=user, detail=f"project_id={row.id}")
    return _response(row)


@router.patch(
    "/projects/{project_id}", response_model=ProjectResponse, responses=PROJECT_ERROR_RESPONSES
)
def update_project(
    user: EditorUser, db: _DbDep, project_id: int, payload: ProjectUpdate
) -> ProjectResponse:
    row = _get_project(db, project_id)
    changes = payload.model_dump(exclude_unset=True)

    old_status = row.status
    new_status = changes.get("status")
    if new_status is not None and new_status == ProjectStatus.rejected:
        # A rejection must carry an explanation for the submitter.
        note = changes.get("triageNote", row.triage_note)
        if not (note or "").strip():
            raise HTTPException(
                status_code=422, detail="Rejecting a project requires a triageNote."
            )

    for field, value in changes.items():
        if isinstance(value, ProjectStatus):
            value = value.value
        setattr(row, _FIELD_TO_COLUMN[field], value)
    row.last_updated_by = user.email
    db.flush()

    if new_status is not None and new_status.value != old_status:
        record_event(
            db,
            action="project.status_changed",
            actor=user,
            detail=f"project_id={row.id} {old_status}->{new_status.value}",
        )
    return _response(row)
