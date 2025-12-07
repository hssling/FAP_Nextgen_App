-- ============================================
-- FIX: get_user_by_username function
-- The issue is type mismatch with auth.users.email
-- ============================================

-- Drop the old function
DROP FUNCTION IF EXISTS get_user_by_username(text);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS TABLE (
  user_id uuid,
  email varchar(255),  -- Changed from 'text' to 'varchar(255)'
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
    u.email::varchar(255),  -- Explicit cast
    p.username,
    p.full_name,
    p.role
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.username = p_username
    AND p.is_active = true;
END;
$$;

-- Test the function
SELECT * FROM get_user_by_username('admin');

-- Expected output:
-- user_id: 5b1af5d7-e2fb-4115-b6a7-5b96870746cc
-- email: hssling@yahoo.com
-- username: admin
-- full_name: HSS Ling
-- role: admin

-- ============================================
-- AFTER THIS WORKS, TRY LOGIN WITH:
-- Username: admin
-- Password: Sidda100
-- ============================================
