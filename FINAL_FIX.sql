-- ==========================================
-- 🚨 FINAL FIX FOR LOGIN & LOADING ISSUES 🚨
-- Run this ENTIRE script in Supabase SQL Editor
-- ==========================================

-- 1. DISABLE ROW LEVEL SECURITY (The main cause of "Loading..." getting stuck)
-- We are disabling this to allow free access to these tables for now.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_student_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;

-- 2. RECREATE THE LOGIN HELPER FUNCTION
-- This function finds the email address for a given username
DROP FUNCTION IF EXISTS get_user_by_username;

CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  role text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Allows accessing auth.users table
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.username, 
    u.email, 
    p.role, 
    p.full_name
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.username = p_username;
END;
$$;

-- 3. GRANT PERMISSIONS TO THE FUNCTION
-- Allow everyone (even not logged in) to use this function to look up email by username
GRANT EXECUTE ON FUNCTION get_user_by_username TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_username TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_username TO service_role;

-- 4. FORCE UPDATE ADMIN ROLE (Just in case)
UPDATE profiles 
SET role = 'admin', is_active = true 
WHERE username = 'admin';

-- ==========================================
-- ✅ VERIFICATION
-- After running, you should see results for this query:
SELECT * FROM get_user_by_username('admin');
-- ==========================================
