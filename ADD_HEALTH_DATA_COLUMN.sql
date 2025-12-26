-- Add missing health_data column to family_members table
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS health_data jsonb DEFAULT '{}'::jsonb;

-- Also ensure the data column exists (for other uses)
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- Add missing columns to families table if needed
ALTER TABLE families
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'family_members'
ORDER BY ordinal_position;
