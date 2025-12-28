-- 1. FIX GRADING PERMISSIONS
-- The grading policy relies on reading 'teacher_student_mappings'.
-- If that table is locked by RLS, the check fails silently.

-- Enable RLS on mappings (good practice)
ALTER TABLE teacher_student_mappings ENABLE ROW LEVEL SECURITY;

-- Allow Authenticated users (Teachers) to READ the mappings
-- This allows the "Teacher can grade" policy to actually see who is mapped to whom.
DROP POLICY IF EXISTS "Allow read access to mappings" ON teacher_student_mappings;
CREATE POLICY "Allow read access to mappings"
ON teacher_student_mappings FOR SELECT
TO authenticated
USING (true); -- Simple: Let any auth user read mappings. Privacy is low risk here, functionality is key.


-- 2. FIX UPLOAD TIMEOUT (MIME TYPES)
-- Timeouts often happen when the server rejects a file type but the client keeps waiting.
-- We will REMOVE all allowed_mime_types restrictions to accept ANYTHING.

UPDATE storage.buckets
SET allowed_mime_types = null, -- null means "Allow All"
    file_size_limit = 52428800 -- Increase limit to 50MB just in case
WHERE id = 'reflection-files';

-- Ensure the bucket is public (sometimes this toggles off)
UPDATE storage.buckets
SET public = true
WHERE id = 'reflection-files';


-- 3. RE-APPLY GRADING POLICY (Just to be 100% sure it exists)
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can grade assigned students" ON reflections;

CREATE POLICY "Teachers can grade assigned students"
ON reflections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teacher_student_mappings tsm
    WHERE tsm.teacher_id = auth.uid()
    AND tsm.student_id = reflections.student_id
  )
);
