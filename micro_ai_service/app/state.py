from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock

from .schemas import JobStatus


@dataclass
class JobState:
    job_id: str
    status: JobStatus
    file_path: str
    original_name: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    extracted_text: str | None = None
    result: dict | None = None
    error: str | None = None


_jobs: dict[str, JobState] = {}
_lock = Lock()


def put_job(job: JobState) -> None:
    with _lock:
        _jobs[job.job_id] = job


def get_job(job_id: str) -> JobState | None:
    with _lock:
        return _jobs.get(job_id)


def update_job(job_id: str, **kwargs) -> JobState | None:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return None
        for key, value in kwargs.items():
            setattr(job, key, value)
        job.updated_at = datetime.now(timezone.utc)
        return job
