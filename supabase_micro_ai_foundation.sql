-- Micro AI foundation schema
-- Run after existing reflections schema and ai extraction metadata migration.

CREATE TABLE IF NOT EXISTS micro_ai_jobs (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES profiles(id),
  source_reflection_id BIGINT REFERENCES reflections(id),
  source_filename TEXT NOT NULL,
  source_content_type TEXT,
  source_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'queued',
  domain TEXT NOT NULL DEFAULT 'reflection',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS micro_ai_results (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES micro_ai_jobs(id) ON DELETE CASCADE,
  extracted_text TEXT,
  payload JSONB NOT NULL,
  provider TEXT,
  model TEXT,
  confidence JSONB,
  quality_checks JSONB,
  disclaimer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reflection_ai_versions (
  id BIGSERIAL PRIMARY KEY,
  reflection_id BIGINT NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  version_type TEXT NOT NULL CHECK (version_type IN ('auto', 'mentor_edit')),
  gibbs_payload JSONB NOT NULL,
  edited_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_micro_ai_jobs_student ON micro_ai_jobs(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_ai_jobs_status ON micro_ai_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_ai_results_job ON micro_ai_results(job_id);
CREATE INDEX IF NOT EXISTS idx_reflection_ai_versions_reflection ON reflection_ai_versions(reflection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor ON ai_audit_logs(actor_id, created_at DESC);
