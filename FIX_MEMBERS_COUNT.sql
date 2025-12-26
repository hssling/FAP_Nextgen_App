-- Fix column name mismatch in families table
-- The code expects 'members_count' but the table has 'total_members'

-- Option 1: Add members_count as an alias/copy (safer, doesn't break existing data)
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS members_count integer;

-- Copy data from total_members to members_count if it exists
UPDATE families 
SET members_count = total_members 
WHERE members_count IS NULL AND total_members IS NOT NULL;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'families' AND column_name IN ('members_count', 'total_members')
ORDER BY column_name;
