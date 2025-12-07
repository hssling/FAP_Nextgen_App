-- ============================================
-- CHECK EXISTING ADMIN PROFILE
-- Run this to see what username is set
-- ============================================

SELECT 
  id,
  username,
  full_name,
  role,
  is_active
FROM profiles 
WHERE id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';

-- ============================================
-- If you need to UPDATE the username:
-- ============================================
/*
UPDATE profiles 
SET username = 'admin',
    full_name = 'HSS Ling'
WHERE id = '5b1af5d7-e2fb-4115-b6a7-5b96870746cc';
*/

-- ============================================
-- THEN LOGIN WITH:
-- ============================================
-- Username: (whatever the query above shows)
-- Password: Sidda100
-- ============================================
