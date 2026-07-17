"""/ask request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(
        min_length=3, max_length=2000, examples=["How do I analyze a budget variance?"]
    )


class Citation(BaseModel):
    # "content" -> sourceKey is a slug; "project" -> sourceKey is a project id.
    sourceType: str
    sourceKey: str
    title: str
    kind: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    # False when retrieval found nothing and the LLM was never called.
    grounded: bool = True
    model: str | None = None
