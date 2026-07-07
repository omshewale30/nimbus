"""/api/v1/admin/* — routes requiring a signed-in user."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.common import ErrorResponse
from app.services.identity.current_user import CurrentUser

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminExampleResponse(BaseModel):
    message: str
    actor: str


ADMIN_ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Missing or invalid bearer token."},
    500: {"model": ErrorResponse, "description": "Unexpected server error."},
}


@router.get("/example", response_model=AdminExampleResponse, responses=ADMIN_ERROR_RESPONSES)
def admin_example(user: CurrentUser) -> AdminExampleResponse:
    """Trivial signed-in endpoint proving bearer auth is wired end-to-end."""
    return AdminExampleResponse(
        message="You are signed in.",
        actor=user.email or user.subject,
    )
