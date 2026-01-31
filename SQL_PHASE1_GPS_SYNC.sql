-- ==========================================
-- 🌍 PHASE 1: GPS & OFFLINE CAPABILITY
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Add GPS and Sync columns to family_visits
ALTER TABLE family_visits 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS gps_accuracy NUMERIC,
ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- 2. Add Sync columns to families
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- 3. Add Sync columns to family_members
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- 4. Create index for faster geospatial queries later
CREATE INDEX IF NOT EXISTS idx_visits_coordinates ON family_visits (latitude, longitude);

-- 5. Enable RLS (In case not enabled)
ALTER TABLE family_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 6. Add comments for clarity
COMMENT ON COLUMN family_visits.is_offline_sync IS 'True if visit was recorded offline and synced later';
COMMENT ON COLUMN families.is_offline_sync IS 'True if family was recorded offline';
COMMENT ON COLUMN family_members.is_offline_sync IS 'True if member was recorded offline';

