-- =========================================================
-- MASTER RLS FIX: ENSURE ALL POLICIES EXIST AND ARE CORRECT
-- Run this in Supabase SQL Editor
-- =========================================================

-- This script is IDEMPOTENT: it safely drops and recreates policies 
-- to ensure the system is in a known good state.

-- 1. UTILITY: Ensure Admin Check Function Exists (Prevents Recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- TABLE: PROFILES
-- =========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1.1 Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "allow_users_read_own_profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- 1.2 Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "allow_users_update_own_profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 1.3 Teachers can view assigned students profiles
DROP POLICY IF EXISTS "Teachers can view assigned students profiles" ON profiles;
CREATE POLICY "Teachers can view assigned students profiles" ON profiles FOR SELECT USING (
  role = 'student' AND
  id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

-- 1.3b Students can view assigned mentor profiles
DROP POLICY IF EXISTS "Students can view assigned mentor profiles" ON profiles;
CREATE POLICY "Students can view assigned mentor profiles" ON profiles FOR SELECT USING (
  role = 'teacher' AND
  id IN (
    SELECT teacher_id FROM teacher_student_mappings
    WHERE student_id = auth.uid() AND is_active = true
  )
);

-- 1.4 Admins can view all profiles (Non-Recursive)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_read_all_profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  is_admin() OR auth.uid() = id
);

-- 1.5 Admins can insert/update profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_insert_profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_update_all_profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());


-- =========================================================
-- TABLE: TEACHER_STUDENT_MAPPINGS
-- =========================================================
ALTER TABLE teacher_student_mappings ENABLE ROW LEVEL SECURITY;

-- 2.1 Students can view own mappings
DROP POLICY IF EXISTS "Students can view own mappings" ON teacher_student_mappings;
CREATE POLICY "Students can view own mappings" ON teacher_student_mappings FOR SELECT USING (student_id = auth.uid());

-- 2.2 Teachers can view own mappings
DROP POLICY IF EXISTS "Teachers can view own mappings" ON teacher_student_mappings;
CREATE POLICY "Teachers can view own mappings" ON teacher_student_mappings FOR SELECT USING (teacher_id = auth.uid());

-- 2.3 Admins can manage all mappings
DROP POLICY IF EXISTS "Admins can manage all mappings" ON teacher_student_mappings;
CREATE POLICY "Admins can manage all mappings" ON teacher_student_mappings FOR ALL USING (is_admin());


-- =========================================================
-- TABLE: FAMILIES
-- =========================================================
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 3.1 Students can access own families (CRUD)
DROP POLICY IF EXISTS "Students can access own families" ON families;
CREATE POLICY "Students can access own families" ON families FOR ALL USING (student_id = auth.uid());

-- 3.2 Teachers can view assigned students' families
DROP POLICY IF EXISTS "Teachers can view assigned students families" ON families;
CREATE POLICY "Teachers can view assigned students families" ON families FOR SELECT USING (
  student_id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

-- 3.3 Admins can view all families
DROP POLICY IF EXISTS "Admins can view all families" ON families;
CREATE POLICY "Admins can view all families" ON families FOR SELECT USING (is_admin());


-- =========================================================
-- TABLE: REFLECTIONS
-- =========================================================
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- 4.1 Students can access own reflections (CRUD)
-- Assuming 'student_id' or 'user_id' column exists. Usually it's 'student_id' or key is linked to auth.uid()
-- Use column 'student_id' if that matches your schema, OR 'user_id'. 
-- Let's check typical Supabase pattern: usually 'user_id' referencing auth.users.
-- SAFEFGUARD: We'll assume the column is named 'student_id' based on previous context, 
-- but if it's 'user_id' this might need adjustment. 
-- Based on FAP app context, reflections are usually linked to 'student_id'.

DROP POLICY IF EXISTS "Students can access own reflections" ON reflections;
CREATE POLICY "Students can access own reflections" ON reflections FOR ALL USING (student_id = auth.uid());

-- 4.2 Teachers can view assigned students' reflections
DROP POLICY IF EXISTS "Teachers can view assigned students reflections" ON reflections;
CREATE POLICY "Teachers can view assigned students reflections" ON reflections FOR SELECT USING (
  student_id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

-- 4.3 Admins can view all reflections (Non-recursive)
DROP POLICY IF EXISTS "Admins can view all reflections" ON reflections;
CREATE POLICY "Admins can view all reflections" ON reflections FOR SELECT USING (is_admin());

-- 4.4 Admins can update all reflections
DROP POLICY IF EXISTS "Admins can update all reflections" ON reflections;
CREATE POLICY "Admins can update all reflections" ON reflections FOR UPDATE USING (is_admin());


-- =========================================================
-- VERIFICATION
-- =========================================================
SELECT 
  tablename,
  count(policyname) as active_policies
FROM pg_policies 
WHERE tablename IN ('profiles', 'teacher_student_mappings', 'families', 'reflections')
GROUP BY tablename
ORDER BY tablename;
