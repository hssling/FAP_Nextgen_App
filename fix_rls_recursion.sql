-- ============================================
-- FIX RLS RECURSION & LOGIN ISSUE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Fix "Admins can view all profiles" recursion
-- The old policy selected from 'profiles' to check if user is admin, 
-- creating an infinite loop. We'll use a safer approach.

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_read_all_profiles" ON profiles;

-- Create a non-recursive policy
-- We check jwt claims if possible, or trust the role check carefully
-- Ideally, we should avoid self-referencing RLS when checking admin status.
-- A common pattern is to have a separate 'admin_users' table or check the 'role' column without a subquery if possible.
-- However, since 'role' is ON the row being accessed, we can just check it for *that* row, but that doesn't help viewing *other* rows.
-- The standard fix for the "Admin" recursion is to use `auth.jwt() ->> 'role'` if using Supabase Auth roles,
-- OR use a SECURITY DEFINER function to check admin status (bypassing RLS).

-- Let's create a secure function to check if current user is admin
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

-- Now use this function in the policy (it bypasses RLS recursion because it's SECURITY DEFINER)
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  auth.uid() = id -- User can always view their own
);

-- 2. Fix other Admin policies similarly
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_insert_profiles" ON profiles;

CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admins_update_all_profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING ( is_admin() );

-- 3. Ensure get_user_by_username exists for Login.jsx
-- This allows looking up email by username securely
DROP FUNCTION IF EXISTS get_user_by_username(text);

CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  full_name text,
  role text
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: runs as superuser, bypassing RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    u.email::text,
    p.username::text,
    p.full_name::text,
    p.role::text
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE lower(p.username) = lower(p_username) -- Case insensitive
    AND p.is_active = true;
END;
$$;

-- Verify
SELECT 
  'Fix Applied Successfully' as status,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'profiles') as policy_count;
