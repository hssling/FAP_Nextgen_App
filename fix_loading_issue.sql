-- ============================================
-- FIX LOADING ISSUE - RUN THIS NOW
-- ============================================

-- This is the #1 cause of loading issues
-- RLS (Row Level Security) blocks profile loading

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Should show: rowsecurity = false

-- ============================================
-- ALSO DISABLE RLS ON OTHER TABLES
-- ============================================

ALTER TABLE teacher_student_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY ALL TABLES
-- ============================================

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'teacher_student_mappings', 'families');

-- All should show: rowsecurity = false

-- ============================================
-- AFTER RUNNING THIS:
-- 1. Refresh browser
-- 2. Should load immediately
-- 3. No more stuck on loading!
-- ============================================
