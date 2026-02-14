from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class IngestResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str = "Job created"


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    error: str | None = None


class EvidenceSpan(BaseModel):
    start: int = Field(ge=0)
    end: int = Field(ge=0)


class GibbsSection(BaseModel):
    text: str = ""
    evidence_spans: list[EvidenceSpan] = Field(default_factory=list)


class GibbsPayload(BaseModel):
    description: GibbsSection = Field(default_factory=GibbsSection)
    feelings: GibbsSection = Field(default_factory=GibbsSection)
    evaluation: GibbsSection = Field(default_factory=GibbsSection)
    analysis: GibbsSection = Field(default_factory=GibbsSection)
    conclusion: GibbsSection = Field(default_factory=GibbsSection)
    action_plan: GibbsSection = Field(default_factory=GibbsSection)


class QualityChecks(BaseModel):
    missing_sections: list[str] = Field(default_factory=list)
    too_short_sections: list[str] = Field(default_factory=list)
    generic_language_flags: list[str] = Field(default_factory=list)
    confidentiality_flags: list[str] = Field(default_factory=list)


class ResultPayload(BaseModel):
    gibbs: GibbsPayload
    quality_checks: QualityChecks
    confidence: dict[str, float]
    disclaimer: str


class ResultResponse(BaseModel):
    job_id: str
    status: JobStatus
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    extracted_text: str | None = None
    result: ResultPayload | None = None
