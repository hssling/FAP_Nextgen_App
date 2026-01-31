-- ==========================================
-- 🔧 LOGIN FIX - Case Insensitive Username
-- Run this ENTIRE script in Supabase SQL Editor
-- ==========================================

-- 1. DROP and RECREATE the login helper function with case-insensitive matching
DROP FUNCTION IF EXISTS get_user_by_username(text);

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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.username, 
    u.email::text, 
    p.role, 
    p.full_name
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(p_username)
    AND p.is_active = true;
END;
$$;

-- 2. GRANT PERMISSIONS TO THE FUNCTION
-- Allow everyone (even anonymous) to use this function for login
GRANT EXECUTE ON FUNCTION get_user_by_username TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_username TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_username TO service_role;

-- 3. Ensure profiles have email column populated (for fallback)
-- This adds email to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- 4. Update profiles with email from auth.users if missing
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 5. Ensure admin account is active
UPDATE profiles 
SET is_active = true 
WHERE username = 'admin' OR role = 'admin';

-- ==========================================
-- ✅ VERIFICATION - Run these to check:
-- ==========================================
-- Test the function (should return results)
SELECT * FROM get_user_by_username('admin');
SELECT * FROM get_user_by_username('Admin'); -- Should also work (case insensitive)

-- Check active admins
SELECT id, username, email, role, is_active FROM profiles WHERE role = 'admin';
