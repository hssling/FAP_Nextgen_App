-- ============================================
-- EMERGENCY FIX - Temporarily disable RLS
-- This will get the app working immediately
-- ============================================

-- OPTION 1: Temporarily disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test if this fixes the issue
SELECT * FROM profiles;

-- ============================================
-- If the app works after this, then we know
-- the issue is with RLS policies.
-- ============================================

-- OPTION 2: If you want to keep RLS enabled,
-- create a simple policy that allows all authenticated users
-- to read all profiles (less secure but will work):

-- First enable RLS again
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all policies
-- DROP POLICY IF EXISTS "allow_users_read_own_profile" ON profiles;
-- DROP POLICY IF EXISTS "allow_admins_read_all_profiles" ON profiles;
-- DROP POLICY IF EXISTS "allow_users_update_own_profile" ON profiles;
-- DROP POLICY IF EXISTS "allow_admins_update_all_profiles" ON profiles;
-- DROP POLICY IF EXISTS "allow_admins_insert_profiles" ON profiles;

-- Create simple policy: all authenticated users can read all profiles
-- CREATE POLICY "allow_authenticated_read_profiles"
-- ON profiles FOR SELECT
-- TO authenticated
-- USING (true);

-- Create simple policy: users can update own profile
-- CREATE POLICY "allow_users_update_own"
-- ON profiles FOR UPDATE
-- TO authenticated
-- USING (auth.uid() = id);

-- ============================================
-- RECOMMENDED: Start with OPTION 1 (disable RLS)
-- to get the app working, then we can fix RLS properly
-- ============================================

-- After running this, refresh your browser!
