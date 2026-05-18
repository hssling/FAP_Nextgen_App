-- Phase 1 validation queries (read-only)
-- Run after schema + RLS scripts.

-- 1) Column checks
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('families', 'family_members', 'data_change_log')
  AND column_name IN (
    'is_deleted', 'deleted_at', 'deleted_by', 'merged_into_member_id', 'version', 'updated_at'
  )
ORDER BY table_name, column_name;

-- 2) Trigger checks
SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('families', 'family_members')
ORDER BY event_object_table, trigger_name;

-- 3) Policy checks
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('families', 'family_members')
ORDER BY tablename, policyname;

-- 4) Count soft-deleted rows (baseline)
SELECT
  (SELECT count(*) FROM public.families WHERE is_deleted = true) AS families_soft_deleted,
  (SELECT count(*) FROM public.family_members WHERE is_deleted = true) AS members_soft_deleted;
