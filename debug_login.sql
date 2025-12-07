-- ============================================
-- DEBUGGING LOGIN ISSUE
-- Run each query one by one
-- ============================================

-- STEP 1: Check if profile exists
SELECT 
  id,
  username,
  full_name,
  role,
  is_active
FROM profiles 
WHERE id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';

-- Expected: Should show your profile with username 'admin'

-- ============================================

-- STEP 2: Check if user exists in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';

-- Expected: Should show your email hssling@yahoo.com

-- ============================================

-- STEP 3: Test the get_user_by_username function
SELECT * FROM get_user_by_username('admin');

-- Expected: Should return user_id, email, username, full_name, role

-- ============================================

-- STEP 4: If function doesn't exist, recreate it
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

-- ============================================

-- STEP 5: Test function again
SELECT * FROM get_user_by_username('admin');

-- ============================================

-- STEP 6: Make sure profile is active and has correct data
UPDATE profiles 
SET 
  username = 'admin',
  full_name = 'HSS Ling',
  role = 'admin',
  is_active = true
WHERE id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';

-- ============================================

-- STEP 7: Verify everything
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.role,
  p.is_active,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';

-- Expected output:
-- id: 5b1af5d7-e2fb-4115-b6a7-5b96870746cc
-- username: admin
-- full_name: HSS Ling
-- role: admin
-- is_active: true
-- email: hssling@yahoo.com

-- ============================================
-- AFTER RUNNING ALL ABOVE, TRY LOGIN WITH:
-- Username: admin
-- Password: Sidda100
-- ============================================
