-- NUCLEAR DEBUGGING FOR STORAGE
-- 1. Reset the Bucket to be as open as possible
UPDATE storage.buckets
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = null
WHERE id = 'reflection-files';

-- 2. Drop existing policies to remove any "CHECK" constraints that might be hanging
DROP POLICY IF EXISTS "Students can upload reflection files" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Reflection Files" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 3. Create SIMPLEST POSSIBLE Allow Policy
-- "If you are logged in, you can upload ANYTHING to reflection-files bucket"
-- No folder checks. No checking auth.uid() match. Just plain INSERT access.

CREATE POLICY "Debug: Allow All Authenticated Inserts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'reflection-files' );

-- 4. Allow Updates too (for upsert)
CREATE POLICY "Debug: Allow All Authenticated Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'reflection-files' );

-- 5. Helper: Ensure read access
CREATE POLICY "Debug: Allow All Select"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'reflection-files' );
