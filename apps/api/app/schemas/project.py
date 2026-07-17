"""Project inventory / intake schemas."""
from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ProjectStatus(StrEnum):
    proposed = "proposed"
    idea = "idea"
    pilot = "pilot"
    active = "active"
    paused = "paused"
    done = "done"
    rejected = "rejected"


class IntakeRequest(BaseModel):
    """The staff-facing 'propose an AI use case' form — deliberately narrow."""

    name: str = Field(min_length=3, max_length=256)
    department: str = Field(default="", max_length=128)
    summary: str = Field(min_length=10, max_length=4000, description="The problem or use case.")
    businessValue: str = Field(default="", max_length=4000)
    risks: str = Field(default="", max_length=4000)
    toolsUsed: list[str] = Field(default_factory=list, max_length=20)


class ProjectCreate(BaseModel):
    """Editor-only direct create: the full field set."""

    name: str = Field(min_length=3, max_length=256)
    department: str = Field(default="", max_length=128)
    ownerEmail: str = Field(default="", max_length=256)
    sponsor: str = Field(default="", max_length=256)
    status: ProjectStatus = ProjectStatus.idea
    summary: str = Field(default="", max_length=4000)
    businessValue: str = Field(default="", max_length=4000)
    risks: str = Field(default="", max_length=4000)
    dependencies: str = Field(default="", max_length=4000)
    nextSteps: str = Field(default="", max_length=4000)
    triageNote: str = Field(default="", max_length=4000)
    toolsUsed: list[str] = Field(default_factory=list, max_length=20)
    relatedSlugs: list[str] = Field(default_factory=list, max_length=20)


class ProjectUpdate(BaseModel):
    """Editor-only patch; also the triage mechanism (status changes)."""

    name: str | None = Field(default=None, min_length=3, max_length=256)
    department: str | None = Field(default=None, max_length=128)
    ownerEmail: str | None = Field(default=None, max_length=256)
    sponsor: str | None = Field(default=None, max_length=256)
    status: ProjectStatus | None = None
    summary: str | None = Field(default=None, max_length=4000)
    businessValue: str | None = Field(default=None, max_length=4000)
    risks: str | None = Field(default=None, max_length=4000)
    dependencies: str | None = Field(default=None, max_length=4000)
    nextSteps: str | None = Field(default=None, max_length=4000)
    triageNote: str | None = Field(default=None, max_length=4000)
    toolsUsed: list[str] | None = Field(default=None, max_length=20)
    relatedSlugs: list[str] | None = Field(default=None, max_length=20)


class ProjectResponse(BaseModel):
    id: int
    name: str
    department: str
    ownerEmail: str
    sponsor: str
    status: ProjectStatus
    summary: str
    businessValue: str
    risks: str
    dependencies: str
    nextSteps: str
    triageNote: str
    toolsUsed: list[str]
    relatedSlugs: list[str]
    submittedBy: str
    lastUpdatedBy: str
    createdAt: datetime
    updatedAt: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
