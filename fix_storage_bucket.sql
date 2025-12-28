-- FORCE FIX for Storage Bucket and Policies
-- Run this in the Supabase SQL Editor

-- 1. Ensure Bucket Exists and is Public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reflection-files', 'reflection-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remove potentially conflicting 'strict' policies
DROP POLICY IF EXISTS "Public Access to Reflection Files" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view all files" ON storage.objects;

-- 3. Create Simplified, Robust Policies

-- Allow ANYONE to read files (if they have the link) - vital for downloads
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reflection-files' );

-- Allow Authenticated Users (Students/Teachers) to Upload
-- We simplify the check to just 'bucket_id' to solve path/permission errors
CREATE POLICY "Authenticated Insert Access"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'reflection-files' );

-- Allow Users to Update/Delete ONLY their own files (using built-in 'owner' column)
CREATE POLICY "Owner Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'reflection-files' AND owner = auth.uid() );

CREATE POLICY "Owner Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'reflection-files' AND owner = auth.uid() );
