-- ============================================
-- Diagnostic Script - Check Database State
-- Run this to see what tables and columns exist
-- ============================================

-- Check if tables exist
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check families table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'families'
ORDER BY ordinal_position;

-- Check villages table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'villages'
ORDER BY ordinal_position;

-- Check RLS policies on families
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'families';

-- Check RLS policies on villages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'villages';
