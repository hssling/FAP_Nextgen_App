-- Allow students to view only their assigned active mentor profile rows.
-- Safe to run in Supabase SQL editor. No data mutation.

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

-- Optional hardening helper for apps that prefer RPC over joins.
CREATE OR REPLACE FUNCTION public.get_student_mentor(student_uuid uuid DEFAULT auth.uid())
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
