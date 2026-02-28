-- Phase 1: RLS hardening for safe student edit/delete operations.
-- Replaces existing policies on families and family_members with explicit role-based access.

BEGIN;

ALTER TABLE IF EXISTS public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_members ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies to avoid accidental broad access.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'families'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.families', p.policyname);
  END LOOP;

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'family_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.family_members', p.policyname);
  END LOOP;
END $$;

-- Families policies
CREATE POLICY families_student_select_own
ON public.families
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY families_student_insert_own
ON public.families
FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY families_student_update_own
ON public.families
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY families_student_delete_own
ON public.families
FOR DELETE
USING (student_id = auth.uid());

CREATE POLICY families_teacher_read_assigned
ON public.families
FOR SELECT
USING (
  student_id IN (
    SELECT tsm.student_id
    FROM public.teacher_student_mappings tsm
    WHERE tsm.teacher_id = auth.uid()
      AND tsm.is_active = true
  )
);

CREATE POLICY families_admin_all
ON public.families
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Family members policies
CREATE POLICY members_student_select_own
ON public.family_members
FOR SELECT
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY members_student_insert_own
ON public.family_members
FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY members_student_update_own
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

CREATE POLICY members_student_delete_own
ON public.family_members
FOR DELETE
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY members_teacher_read_assigned
ON public.family_members
FOR SELECT
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id IN (
      SELECT tsm.student_id
      FROM public.teacher_student_mappings tsm
      WHERE tsm.teacher_id = auth.uid()
        AND tsm.is_active = true
    )
  )
);

CREATE POLICY members_admin_all
ON public.family_members
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

COMMIT;
