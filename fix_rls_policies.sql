-- ============================================
-- FIX RLS POLICIES - Allow admins to read profiles
-- The 500 error is because RLS is blocking the query
-- ============================================

-- First, let's check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================
-- DROP AND RECREATE POLICIES WITH CORRECT PERMISSIONS
-- ============================================

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can view assigned students profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies with correct permissions

-- 1. Allow users to view their own profile
CREATE POLICY "allow_users_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Allow admins to read ALL profiles
CREATE POLICY "allow_admins_read_all_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- 3. Allow users to update their own profile
CREATE POLICY "allow_users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Allow admins to insert new profiles
CREATE POLICY "allow_admins_insert_profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- 5. Allow admins to update any profile
CREATE POLICY "allow_admins_update_all_profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- ============================================
-- VERIFY POLICIES ARE CREATED
-- ============================================
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Expected output: 5 policies
-- allow_admins_insert_profiles
-- allow_admins_read_all_profiles
-- allow_admins_update_all_profiles
-- allow_users_read_own_profile
-- allow_users_update_own_profile

-- ============================================
-- TEST THE POLICIES
-- ============================================

-- This should now work when logged in as admin
SELECT * FROM profiles;

-- ============================================
-- AFTER RUNNING THIS, REFRESH THE BROWSER
-- ============================================
