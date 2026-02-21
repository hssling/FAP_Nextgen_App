-- FAP NextGen: Consolidated DB patch (idempotent)
-- Run this whole script once in Supabase SQL editor.
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS / DROP IF EXISTS patterns.

BEGIN;

-- =========================================================
-- 1) Student identity: year_of_joining + constraints/index
-- =========================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS year_of_joining integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'year_of_joining'
  ) THEN
    ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_year_of_joining_check;

    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_year_of_joining_check
    CHECK (year_of_joining IS NULL OR (year_of_joining BETWEEN 2000 AND 2100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_year_of_joining
ON public.profiles(year_of_joining);

COMMENT ON COLUMN public.profiles.year_of_joining
IS 'Student batch year (e.g., 2025). Preferred over legacy year column.';

-- Business rule currently in use: existing year-1 students are 2025 batch.
UPDATE public.profiles
SET year_of_joining = 2025
WHERE role = 'student'
  AND year = 1
  AND (year_of_joining IS NULL OR year_of_joining <> 2025);

-- Keep legacy year synchronized from year_of_joining.
UPDATE public.profiles
SET year = LEAST(3, GREATEST(1, EXTRACT(YEAR FROM CURRENT_DATE)::int - year_of_joining + 1))
WHERE role = 'student'
  AND year_of_joining IS NOT NULL
  AND year IS DISTINCT FROM LEAST(3, GREATEST(1, EXTRACT(YEAR FROM CURRENT_DATE)::int - year_of_joining + 1));

-- =========================================================
-- 2) Student can read assigned mentor profile (RLS policy)
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view assigned mentor profiles" ON public.profiles;

CREATE POLICY "Students can view assigned mentor profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'teacher'
  AND id IN (
    SELECT m.teacher_id
    FROM public.teacher_student_mappings m
    WHERE m.student_id = auth.uid()
      AND m.is_active = true
  )
);

-- =========================================================
-- 3) Mentor lookup RPC used by frontend fallback
-- =========================================================
DROP FUNCTION IF EXISTS public.get_student_mentor(uuid);

CREATE FUNCTION public.get_student_mentor(student_uuid uuid DEFAULT auth.uid())
RETURNS TABLE (
  teacher_id uuid,
  teacher_name text,
  teacher_department text,
  assigned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF student_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.department,
    m.assigned_at
  FROM public.teacher_student_mappings m
  JOIN public.profiles p ON p.id = m.teacher_id
  WHERE m.student_id = student_uuid
    AND m.is_active = true
  ORDER BY m.assigned_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_mentor(uuid) TO authenticated;

COMMIT;

-- =========================================================
-- 4) Post-run checks (read-only)
-- =========================================================
-- Roll-number completeness summary for active students
SELECT
  count(*) AS total_active_students,
  count(*) FILTER (
    WHERE coalesce(nullif(trim(registration_number), ''), '') <> ''
  ) AS students_with_roll_number,
  count(*) FILTER (
    WHERE coalesce(nullif(trim(registration_number), ''), '') = ''
  ) AS students_missing_roll_number
FROM public.profiles
WHERE role = 'student'
  AND is_active = true;

-- Mentor mapping visibility check for current user (run as a student to verify)
SELECT * FROM public.get_student_mentor(auth.uid());
