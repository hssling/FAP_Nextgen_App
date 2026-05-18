-- Phase 1: additive RLS support for safe student edit/archive operations.
-- This script intentionally does not drop or replace existing policies.

BEGIN;

ALTER TABLE IF EXISTS public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'families'
      AND policyname = 'families_student_update_own_safe_edit'
  ) THEN
    CREATE POLICY families_student_update_own_safe_edit
    ON public.families
    FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'family_members'
      AND policyname = 'members_student_update_own_safe_edit'
  ) THEN
    CREATE POLICY members_student_update_own_safe_edit
    ON public.family_members
    FOR UPDATE
    USING (
      family_id IN (
        SELECT f.id
        FROM public.families f
        WHERE f.student_id = auth.uid()
      )
    )
    WITH CHECK (
      family_id IN (
        SELECT f.id
        FROM public.families f
        WHERE f.student_id = auth.uid()
      )
    );
  END IF;
END $$;

COMMIT;
