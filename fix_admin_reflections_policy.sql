-- ============================================
-- FIX: Add Admin RLS Policy for Reflections Table
-- Run this in Supabase SQL Editor
-- ============================================

-- Add policy for admins to view ALL reflections
DROP POLICY IF EXISTS "Admins can view all reflections" ON reflections;

CREATE POLICY "Admins can view all reflections" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also add admin policy to update reflections if needed
DROP POLICY IF EXISTS "Admins can update all reflections" ON reflections;

CREATE POLICY "Admins can update all reflections" ON reflections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify the policies were created
SELECT 
  'Reflections Policies Created:' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'reflections'
ORDER BY policyname;
