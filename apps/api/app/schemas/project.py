"""Project inventory / intake schemas."""
from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProjectStatus(StrEnum):
    proposed = "proposed"
    idea = "idea"
    pilot = "pilot"
    active = "active"
    paused = "paused"
    done = "done"
    rejected = "rejected"


class ProjectSource(StrEnum):
    """Origin of the record; immutable after creation."""

    proposed = "proposed"
    inventoried = "inventoried"


class _ProjectSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ProjectIntakeRequest(_ProjectSchema):
    """The staff-facing 'propose an AI use case' form — deliberately narrow."""

    name: str = Field(min_length=3, max_length=256)
    department: str = Field(default="", max_length=128)
    summary: str = Field(min_length=10, max_length=4000, description="The problem or use case.")
    business_value: str = Field(default="", alias="businessValue", max_length=4000)
    risks: str = Field(default="", max_length=4000)
    tools_used: list[str] = Field(default_factory=list, alias="toolsUsed", max_length=20)


class ProjectInventoryRequest(_ProjectSchema):
    """Editor-only 'inventory an existing project' form.

    Full registry field set; no triage_note (nothing to triage — the project
    already exists). Status defaults to `active` since most inventoried work
    is in flight.
    """

    name: str = Field(min_length=3, max_length=256)
    department: str = Field(default="", max_length=128)
    owner_email: str = Field(default="", alias="ownerEmail", max_length=256)
    sponsor: str = Field(default="", max_length=256)
    stakeholders: list[str] = Field(default_factory=list, max_length=20)
    status: ProjectStatus = ProjectStatus.active
    summary: str = Field(min_length=10, max_length=4000)
    business_value: str = Field(default="", alias="businessValue", max_length=4000)
    risks: str = Field(default="", max_length=4000)
    dependencies: str = Field(default="", max_length=4000)
    next_steps: str = Field(default="", alias="nextSteps", max_length=4000)
    tools_used: list[str] = Field(default_factory=list, alias="toolsUsed", max_length=20)
    related_slugs: list[str] = Field(default_factory=list, alias="relatedSlugs", max_length=20)
    strategic_category: str = Field(default="", alias="strategicCategory", max_length=128)
    start_date: date | None = Field(default=None, alias="startDate")
    target_date: date | None = Field(default=None, alias="targetDate")

    @model_validator(mode="after")
    def target_not_before_start(self) -> "ProjectInventoryRequest":
        if self.start_date and self.target_date and self.target_date < self.start_date:
            raise ValueError("targetDate must not be before startDate")
        return self


class ProjectCreateRequest(_ProjectSchema):
    """Editor-only direct create: the full field set."""

    name: str = Field(min_length=3, max_length=256)
    department: str = Field(default="", max_length=128)
    owner_email: str = Field(default="", alias="ownerEmail", max_length=256)
    sponsor: str = Field(default="", max_length=256)
    status: ProjectStatus = ProjectStatus.idea
    summary: str = Field(default="", max_length=4000)
    business_value: str = Field(default="", alias="businessValue", max_length=4000)
    risks: str = Field(default="", max_length=4000)
    dependencies: str = Field(default="", max_length=4000)
    next_steps: str = Field(default="", alias="nextSteps", max_length=4000)
    triage_note: str = Field(default="", alias="triageNote", max_length=4000)
    tools_used: list[str] = Field(default_factory=list, alias="toolsUsed", max_length=20)
    related_slugs: list[str] = Field(default_factory=list, alias="relatedSlugs", max_length=20)


class ProjectUpdateRequest(_ProjectSchema):
    """Editor-only patch; also the triage mechanism (status changes)."""

    name: str | None = Field(default=None, min_length=3, max_length=256)
    department: str | None = Field(default=None, max_length=128)
    owner_email: str | None = Field(default=None, alias="ownerEmail", max_length=256)
    sponsor: str | None = Field(default=None, max_length=256)
    status: ProjectStatus | None = None
    summary: str | None = Field(default=None, max_length=4000)
    business_value: str | None = Field(default=None, alias="businessValue", max_length=4000)
    risks: str | None = Field(default=None, max_length=4000)
    dependencies: str | None = Field(default=None, max_length=4000)
    next_steps: str | None = Field(default=None, alias="nextSteps", max_length=4000)
    triage_note: str | None = Field(default=None, alias="triageNote", max_length=4000)
    tools_used: list[str] | None = Field(default=None, alias="toolsUsed", max_length=20)
    related_slugs: list[str] | None = Field(default=None, alias="relatedSlugs", max_length=20)
    stakeholders: list[str] | None = Field(default=None, max_length=20)
    strategic_category: str | None = Field(default=None, alias="strategicCategory", max_length=128)
    start_date: date | None = Field(default=None, alias="startDate")
    target_date: date | None = Field(default=None, alias="targetDate")

    @model_validator(mode="after")
    def rejected_status_requires_note(self) -> "ProjectUpdateRequest":
        if self.status == ProjectStatus.rejected and not (self.triage_note or "").strip():
            raise ValueError("triageNote is required when rejecting a project")
        return self

    @model_validator(mode="after")
    def target_not_before_start(self) -> "ProjectUpdateRequest":
        if self.start_date and self.target_date and self.target_date < self.start_date:
            raise ValueError("targetDate must not be before startDate")
        return self


class ProjectResponse(_ProjectSchema):
    id: int
    name: str
    department: str
    owner_email: str = Field(alias="ownerEmail")
    sponsor: str
    status: ProjectStatus
    source: ProjectSource
    summary: str
    business_value: str = Field(alias="businessValue")
    risks: str
    dependencies: str
    next_steps: str = Field(alias="nextSteps")
    triage_note: str = Field(alias="triageNote")
    tools_used: list[str] = Field(alias="toolsUsed")
    related_slugs: list[str] = Field(alias="relatedSlugs")
    stakeholders: list[str]
    strategic_category: str = Field(alias="strategicCategory")
    start_date: date | None = Field(alias="startDate")
    target_date: date | None = Field(alias="targetDate")
    submitted_by: str = Field(alias="submittedBy")
    last_updated_by: str = Field(alias="lastUpdatedBy")
    archived_at: datetime | None = Field(alias="archivedAt")
    archived_by: str = Field(alias="archivedBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ProjectListResponse(_ProjectSchema):
    items: list[ProjectResponse]
    total: int
