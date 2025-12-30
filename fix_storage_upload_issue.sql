-- ==================================================
-- SAFE / NON-DESTRUCTIVE STORAGE FIX
-- ==================================================
-- This script adds the missing upload policy ONLY if it doesn't exist.
-- It will NOT delete or change any existing policies.
-- ==================================================

DO $$
BEGIN
    -- 1. Create Bucket if missing (safe operation)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('reflection-files', 'reflection-files', true, 10485760, null)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Add Upload Policy (Only if missing)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Authenticated users can upload reflection files'
    ) THEN
        CREATE POLICY "Authenticated users can upload reflection files"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK ( bucket_id = 'reflection-files' );
        
        RAISE NOTICE '✅ Added missing upload policy.';
    ELSE
        RAISE NOTICE 'ℹ️ Upload policy already exists. Skipping.';
    END IF;

    -- 3. Add Select Policy (Only if missing)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Anyone can read reflection files'
    ) THEN
        CREATE POLICY "Anyone can read reflection files"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'reflection-files' );
        
        RAISE NOTICE '✅ Added missing read policy.';
    ELSE
        RAISE NOTICE 'ℹ️ Read policy already exists. Skipping.';
    END IF;

END $$;
