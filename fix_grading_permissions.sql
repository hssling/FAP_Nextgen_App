-- Enable RLS on reflections table if not already on
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- 1. CLEANUP: Drop existing policies that might conflict (optional, but safe)
DROP POLICY IF EXISTS "Teachers can grade their students" ON reflections;
DROP POLICY IF EXISTS "Users can view their own data" ON reflections;
DROP POLICY IF EXISTS "Users can insert their own data" ON reflections;
DROP POLICY IF EXISTS "Users can update their own data" ON reflections;
DROP POLICY IF EXISTS "Users can delete their own data" ON reflections;

-- 2. BASIC POLICIES (Re-creating standard access)

-- Users can see their own reflections
CREATE POLICY "Users can view their own data"
ON reflections FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Students can insert their own reflections
CREATE POLICY "Users can insert their own data"
ON reflections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can update their own reflections (Only if not graded? Optional logic, keeping simple for now)
CREATE POLICY "Users can update their own data"
ON reflections FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- Students can delete their own reflections
CREATE POLICY "Users can delete their own data"
ON reflections FOR DELETE
TO authenticated
USING (auth.uid() = student_id);


-- 3. TEACHER ACCESS POLICIES (The Fix)

-- Teachers can VIEW reflections of students mapped to them
CREATE POLICY "Teachers can view assigned students reflections"
ON reflections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teacher_student_mappings tsm
    WHERE tsm.teacher_id = auth.uid()
    AND tsm.student_id = reflections.student_id
  )
);

-- Teachers can UPDATE (Grade) reflections of students mapped to them
-- We specifically enable UPDATE access for this relationship
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
