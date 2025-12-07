-- ============================================
-- FAP NextGen - Database Schema Setup (FIXED)
-- Run this in Supabase SQL Editor
-- This version handles existing tables properly
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: DROP EXISTING TABLES (if needed)
-- ============================================
-- Uncomment these lines if you need to start fresh:
-- DROP TABLE IF EXISTS teacher_student_mappings CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- STEP 2: CREATE PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  year integer CHECK (year IN (1, 2, 3)),
  department text,
  phone text,
  registration_number text UNIQUE,
  employee_id text UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ============================================
-- STEP 3: CREATE TEACHER-STUDENT MAPPINGS
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_student_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  notes text,
  UNIQUE(teacher_id, student_id),
  CHECK (teacher_id != student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mappings_teacher ON teacher_student_mappings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mappings_student ON teacher_student_mappings(student_id);
CREATE INDEX IF NOT EXISTS idx_mappings_active ON teacher_student_mappings(is_active);

-- ============================================
-- STEP 4: UPDATE FAMILIES TABLE
-- ============================================
-- Check if column exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'families' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE families ADD COLUMN student_id uuid REFERENCES profiles(id);
    CREATE INDEX idx_families_student ON families(student_id);
  END IF;
END $$;

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Create new policies for profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Teachers can view assigned students profiles"
ON profiles FOR SELECT
USING (
  role = 'student' AND
  id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Enable RLS on teacher_student_mappings
ALTER TABLE teacher_student_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teacher_student_mappings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON teacher_student_mappings';
    END LOOP;
END $$;

-- Create new policies for mappings
CREATE POLICY "Students can view own mappings"
ON teacher_student_mappings FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view own mappings"
ON teacher_student_mappings FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all mappings"
ON teacher_student_mappings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Enable RLS on families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'families') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON families';
    END LOOP;
END $$;

-- Create new policies for families
CREATE POLICY "Students can access own families"
ON families FOR ALL
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view assigned students families"
ON families FOR SELECT
USING (
  student_id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can view all families"
ON families FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user by username
CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  full_name text,
  role text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    u.email,
    p.username,
    p.full_name,
    p.role
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.username = p_username
    AND p.is_active = true;
END;
$$;

-- Function to get student's mentor
CREATE OR REPLACE FUNCTION get_student_mentor(student_uuid uuid)
RETURNS TABLE (
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  teacher_department text,
  assigned_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email,
    p.department,
    m.assigned_at
  FROM teacher_student_mappings m
  JOIN profiles p ON m.teacher_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE m.student_id = student_uuid
    AND m.is_active = true
  LIMIT 1;
END;
$$;

-- Function to get teacher's students
CREATE OR REPLACE FUNCTION get_teacher_students(teacher_uuid uuid)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  year integer,
  registration_number text,
  assigned_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email,
    p.year,
    p.registration_number,
    m.assigned_at
  FROM teacher_student_mappings m
  JOIN profiles p ON m.student_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE m.teacher_id = teacher_uuid
    AND m.is_active = true
  ORDER BY p.year, p.full_name;
END;
$$;

-- ============================================
-- STEP 7: CREATE TRIGGERS
-- ============================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 8: VERIFICATION
-- ============================================

-- Check tables exist
SELECT 'Tables created successfully!' as status,
       table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'teacher_student_mappings')
ORDER BY table_name;

-- Check RLS enabled
SELECT 'RLS enabled on:' as status,
       tablename, 
       rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teacher_student_mappings', 'families')
ORDER BY tablename;

-- Check policies created
SELECT 'Policies created:' as status,
       tablename,
       COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('profiles', 'teacher_student_mappings', 'families')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- You should see:
-- ✅ 2 tables created (profiles, teacher_student_mappings)
-- ✅ RLS enabled on 3 tables
-- ✅ Multiple policies per table
--
-- Next step: Create your first admin user!
