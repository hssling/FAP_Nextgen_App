-- Check family_members table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'family_members'
ORDER BY ordinal_position;

-- Check if health_data column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'family_members' 
    AND column_name = 'health_data'
) as health_data_exists;

-- Check families table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'families'
ORDER BY ordinal_position;

-- Check all tables in public schema
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
