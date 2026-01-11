-- ============================================
-- FIX MENTOR PERMISSIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- The previous RLS update accidentally removed the teacher policies.
-- We need to restore them.

-- 1. Allow Teachers to view their assigned students' profiles
DROP POLICY IF EXISTS "run_fix_mentor_permissions" ON profiles; -- Cleanup placeholder if exists
DROP POLICY IF EXISTS "Teachers can view assigned students profiles" ON profiles;

CREATE POLICY "Teachers can view assigned students profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  role = 'student' AND
  id IN (
    SELECT student_id 
    FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() 
      AND is_active = true
  )
);

-- 2. Allow Teachers to view their own mappings
DROP POLICY IF EXISTS "Teachers can view own mappings" ON teacher_student_mappings;

CREATE POLICY "Teachers can view own mappings"
ON teacher_student_mappings FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- 3. Allow Teachers to view their assigned students' families
DROP POLICY IF EXISTS "Teachers can view assigned students families" ON families;

CREATE POLICY "Teachers can view assigned students families"
ON families FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() 
      AND is_active = true
  )
);

-- Verify
SELECT 
  'Mentor Policies Restored' as status,
  tablename,
  policyname
FROM pg_policies 
WHERE policyname LIKE 'Teachers%'
ORDER BY tablename;
