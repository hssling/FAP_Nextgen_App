-- ============================================
-- DIAGNOSE RLS POLICY ISSUES ON REFLECTIONS TABLE
-- Run this in Supabase SQL Editor to check for problems
-- ============================================

-- 1. Check current policies on reflections table
SELECT 
    'Current Reflections Policies:' as step,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'reflections'
ORDER BY policyname;

-- 2. Check if there are recursive/slow policy references
-- (policies that reference other RLS-protected tables)
SELECT 
    'Potential recursive RLS check:' as warning,
    p.policyname,
    d.description
FROM pg_policies p
LEFT JOIN pg_description d ON d.objoid = p.oid
WHERE p.tablename = 'reflections';

-- 3. Try a test insert (dry run - will be rolled back)
DO $$
DECLARE
    test_start TIMESTAMP;
    test_end TIMESTAMP;
BEGIN
    test_start := clock_timestamp();
    
    -- NOTE: Change this UUID to a valid student_id from your profiles table
    -- INSERT INTO reflections (student_id, content, phase, status)
    -- VALUES ('YOUR-STUDENT-UUID-HERE', 'Test insert timing', 'Phase I', 'Pending');
    
    test_end := clock_timestamp();
    RAISE NOTICE 'Insert would take approximately: %', (test_end - test_start);
    
    -- Rollback to not actually insert
    -- ROLLBACK;
END $$;

-- 4. Check connection pool status (if using pgbouncer)
-- SELECT * FROM pg_stat_activity WHERE datname = current_database();

-- 5. RECOMMENDED FIX: Simplify the INSERT policy
-- The INSERT policy should be as simple as possible

-- Drop and recreate with optimized policy:
-- (Run this if you want to fix the issue)

/*
-- BACKUP: Save current policies
-- Then run:

DROP POLICY IF EXISTS "Users can insert their own reflections" ON reflections;

CREATE POLICY "Users can insert their own reflections"
ON reflections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- This is the simplest possible insert policy
*/

-- 6. Check if there are any blocking queries
SELECT 
    'Active queries on reflections:' as info,
    pid, 
    query_start, 
    state,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE query ILIKE '%reflections%'
  AND state != 'idle'
LIMIT 10;
