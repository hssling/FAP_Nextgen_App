-- Safe student insert policy for AI audit logs
-- Run AFTER supabase_micro_ai_foundation.sql
-- Purpose:
-- 1) Keep admin-only read access unchanged.
-- 2) Allow students to insert only tightly-scoped AI extraction audit events for their own actor_id.

-- Keep teacher/admin insert policy as-is (drop/recreate for idempotency)
DROP POLICY IF EXISTS "ai_audit_logs_insert_teacher_admin" ON ai_audit_logs;
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

-- Student-safe insert policy:
-- - actor_id must be current user
-- - target_type locked to reflection AI extraction
-- - action locked to known extraction lifecycle events
DROP POLICY IF EXISTS "ai_audit_logs_insert_student_safe" ON ai_audit_logs;
CREATE POLICY "ai_audit_logs_insert_student_safe"
ON ai_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND target_type = 'reflection_ai_extraction'
  AND action IN (
    'gibbs_extraction_queued',
    'gibbs_extraction_completed',
    'gibbs_extraction_failed'
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'student'
  )
);
