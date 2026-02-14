# Micro AI Service (Foundation)

This branch adds a foundation `micro_ai_service` for async ingestion and structured reflection extraction.

## Scope in this release

- FastAPI endpoints:
  - `POST /v1/ingest`
  - `GET /v1/job/{id}`
  - `GET /v1/result/{id}`
- Async processing using background worker thread (queue-ready architecture).
- Multi-format text extraction dispatcher:
  - `.docx` via `python-docx`
  - native `.pdf` via `pdfplumber` + `pypdf`
  - scanned images via `pytesseract`
- Structured Gibbs output schema with:
  - `evidence_spans`
  - `quality_checks`
  - `confidence`
  - mandatory safety disclaimer
- Safety guard to block definitive diagnosis-style statements.
- DB migration for jobs/results/versioning/audit tables.

## One-command local startup

```bash
docker compose up --build
```

Services:
- API: `http://localhost:8000`
- Redis: `localhost:6379`
- Postgres: `localhost:5433`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Quick API test

```bash
curl -X POST "http://localhost:8000/v1/ingest" \
  -F "file=@sample_reflection.txt"
```

```bash
curl "http://localhost:8000/v1/job/<job_id>"
curl "http://localhost:8000/v1/result/<job_id>"
```

## Environment variables

- `MICRO_AI_MEDIA_ROOT` (default `/tmp/micro_ai_media`)
- `MICRO_AI_RESULTS_ROOT` (default `/tmp/micro_ai_results`)
- `MICRO_AI_REDIS_URL` (default `redis://redis:6379/0`)
- `MICRO_AI_MAX_UPLOAD_MB` (default `25`)

## Safety boundary implemented

All health outputs are decision-support only and include:

`Decision-support only. Confirm with a qualified clinician. This output is not a diagnosis.`

Definitive diagnosis style phrases are blocked in output generation.

## Database migration

Run:

- `supabase_micro_ai_foundation.sql`

This creates:
- `micro_ai_jobs`
- `micro_ai_results`
- `reflection_ai_versions`
- `ai_audit_logs`
