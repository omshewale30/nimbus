"""/api/v1/projects — the AI project inventory and intake workflow.

Reads are open to all authenticated users (leadership visibility is the
point). Intake is open to everyone and always lands as `proposed`. Direct
creation, edits, and triage (status changes) are editor-only.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.models.project import Project
from app.schemas.common import ErrorResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectIntakeRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdateRequest,
)
from app.services.audit import record_event
from app.services.identity.current_user import CurrentUser, EditorUser

router = APIRouter(prefix="/projects", tags=["projects"])

PROJECT_ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing or invalid bearer token."},
    403: {"model": ErrorResponse, "description": "Editor access required."},
    404: {"model": ErrorResponse, "description": "No project with that id."},
    422: {"model": ErrorResponse, "description": "Request validation failed."},
    500: {"model": ErrorResponse, "description": "Unexpected server error."},
}


def _to_response(row: Project) -> ProjectResponse:
    return ProjectResponse.model_validate(row)


def _get_project(db: Session, project_id: int) -> Project:
    row = db.get(Project, project_id)
    if row is None:
        raise NotFoundError(f"No project with id {project_id}")
    return row


@router.get("", response_model=ProjectListResponse, responses=PROJECT_ERROR_RESPONSES)
def list_projects(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    status: Annotated[ProjectStatus | None, Query()] = None,
    department: str | None = None,
) -> ProjectListResponse:
    stmt = select(Project).order_by(Project.updated_at.desc())
    if status:
        stmt = stmt.where(Project.status == status.value)
    if department:
        stmt = stmt.where(Project.department == department)
    rows = db.execute(stmt).scalars().all()
    return ProjectListResponse(items=[_to_response(r) for r in rows], total=len(rows))


@router.get("/{project_id}", response_model=ProjectResponse, responses=PROJECT_ERROR_RESPONSES)
def get_project(
    project_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    return _to_response(_get_project(db, project_id))


@router.post(
    "/intake",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    responses=PROJECT_ERROR_RESPONSES,
)
async def submit_intake(
    payload: ProjectIntakeRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    """Open to every authenticated user; always lands as `proposed`."""
    row = Project(
        **payload.model_dump(),
        status=ProjectStatus.proposed.value,
        submitted_by=user.email,
        last_updated_by=user.email,
    )
    db.add(row)
    db.flush()
    record_event(db, action="project.intake", actor=user, detail=f"project_id={row.id}")
    await _reindex_project(db, row)
    return _to_response(row)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    responses=PROJECT_ERROR_RESPONSES,
)
async def create_project(
    payload: ProjectCreateRequest,
    user: EditorUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    data = payload.model_dump()
    data["status"] = payload.status.value
    row = Project(**data, submitted_by=user.email, last_updated_by=user.email)
    db.add(row)
    db.flush()
    record_event(db, action="project.created", actor=user, detail=f"project_id={row.id}")
    await _reindex_project(db, row)
    return _to_response(row)


@router.patch("/{project_id}", response_model=ProjectResponse, responses=PROJECT_ERROR_RESPONSES)
async def update_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    user: EditorUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    row = _get_project(db, project_id)
    old_status = row.status

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(row, field, value.value if isinstance(value, ProjectStatus) else value)
    row.last_updated_by = user.email
    db.flush()

    if "status" in changes and row.status != old_status:
        record_event(
            db,
            action="project.status_changed",
            actor=user,
            detail=f"project_id={row.id} {old_status}->{row.status}",
        )
    await _reindex_project(db, row)
    return _to_response(row)


async def _reindex_project(db: Session, row: Project) -> None:
    """Refresh this project's RAG chunks; a no-op outside Postgres.

    Imported lazily so the projects routes have no import-time dependency on
    the RAG stack.
    """
    from app.services.rag.indexer import reindex_project_inline

    await reindex_project_inline(db, row)
