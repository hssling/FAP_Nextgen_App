-- 0. SCHEMA FIX: Add missing grading columns
-- These columns are required for the grading capability
ALTER TABLE reflections 
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';


-- 1. CLEANUP: Drop old functions
DROP FUNCTION IF EXISTS grade_reflection(uuid, uuid, jsonb, text, text, int);
DROP FUNCTION IF EXISTS grade_reflection(bigint, uuid, jsonb, text, text, int);


-- 2. CREATE FUNCTION (Grading Logic)
CREATE OR REPLACE FUNCTION grade_reflection(
  p_reflection_id bigint, 
  p_teacher_id uuid,
  p_scores jsonb,
  p_feedback text,
  p_grade text,
  p_total_score int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_is_authorized boolean;
BEGIN
  -- Check ID
  SELECT student_id INTO v_student_id FROM reflections WHERE id = p_reflection_id;
  IF v_student_id IS NULL THEN
     RAISE EXCEPTION 'Reflection not found with ID %', p_reflection_id;
  END IF;

  -- Check Authorization
  SELECT EXISTS (
    SELECT 1 FROM teacher_student_mappings 
    WHERE teacher_id = p_teacher_id AND student_id = v_student_id
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to grade this student.';
  END IF;

  -- Update Reflection
  UPDATE reflections
  SET 
    score_exploration = (p_scores->>'score_exploration')::int,
    score_voice = (p_scores->>'score_voice')::int,
    score_description = (p_scores->>'score_description')::int,
    score_emotions = (p_scores->>'score_emotions')::int,
    score_analysis = (p_scores->>'score_analysis')::int,
    teacher_feedback = p_feedback,
    grade = p_grade,
    status = 'Graded',
    graded_at = NOW()
  WHERE id = p_reflection_id;

  RETURN true;
END;
$$;


-- 3. ENSURE UPLOAD PERMISSIONS (Safety Check)
UPDATE storage.buckets SET public = true, file_size_limit = 52428800, allowed_mime_types = null WHERE id = 'reflection-files';
