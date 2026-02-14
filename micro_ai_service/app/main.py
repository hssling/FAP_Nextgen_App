from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from threading import Thread
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .jobs import process_job
from .schemas import IngestResponse, JobResponse, ResultResponse
from .state import JobState, get_job, put_job

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_dirs() -> None:
    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    Path(settings.results_root).mkdir(parents=True, exist_ok=True)


@app.on_event("startup")
def on_startup() -> None:
    _ensure_dirs()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": settings.app_name}


@app.post("/v1/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)) -> IngestResponse:
    raw = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb} MB")

    job_id = str(uuid4())
    filename = file.filename or "upload.bin"
    ext = Path(filename).suffix
    save_path = Path(settings.media_root) / f"{job_id}{ext}"
    save_path.write_bytes(raw)

    now = datetime.now(timezone.utc)
    state = JobState(
        job_id=job_id,
        status="queued",
        file_path=str(save_path),
        original_name=filename,
        created_at=now,
        updated_at=now,
    )
    put_job(state)

    worker = Thread(target=process_job, args=(job_id, str(save_path)), daemon=True)
    worker.start()

    return IngestResponse(job_id=job_id, status="queued")


@app.get("/v1/job/{job_id}", response_model=JobResponse)
def job_status(job_id: str) -> JobResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        error=job.error,
    )


@app.get("/v1/result/{job_id}", response_model=ResultResponse)
def result(job_id: str) -> ResultResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return ResultResponse(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
        completed_at=job.completed_at,
        error=job.error,
        extracted_text=job.extracted_text,
        result=job.result,
    )
