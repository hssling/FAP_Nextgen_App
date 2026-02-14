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

-- RLS
ALTER TABLE micro_ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_ai_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_ai_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Students and mentors can read jobs linked to their own reflections.
CREATE POLICY "micro_ai_jobs_select_student_or_teacher"
ON micro_ai_jobs
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

CREATE POLICY "micro_ai_jobs_insert_owner"
ON micro_ai_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

CREATE POLICY "micro_ai_jobs_update_teacher_admin"
ON micro_ai_jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

CREATE POLICY "micro_ai_results_select_student_or_teacher"
ON micro_ai_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM micro_ai_jobs j
    WHERE j.id = micro_ai_results.job_id
      AND (
        j.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
      )
  )
);

CREATE POLICY "micro_ai_results_insert_service_or_admin"
ON micro_ai_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

CREATE POLICY "reflection_ai_versions_select_student_or_teacher"
ON reflection_ai_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM reflections r
    WHERE r.id = reflection_ai_versions.reflection_id
      AND (
        r.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
      )
  )
);

CREATE POLICY "reflection_ai_versions_insert_teacher_or_admin"
ON reflection_ai_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

CREATE POLICY "ai_audit_logs_select_admin_only"
ON ai_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "ai_audit_logs_insert_teacher_admin"
ON ai_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);
