-- FAP App Reflection System Upgrade (v2)
-- Run this script in your Supabase SQL Editor to enable Gibbs Cycle and File Uploads

-- 1. Add new columns to 'reflections' table
ALTER TABLE reflections 
ADD COLUMN IF NOT EXISTS gibbs_description TEXT,
ADD COLUMN IF NOT EXISTS gibbs_feelings TEXT,
ADD COLUMN IF NOT EXISTS gibbs_evaluation TEXT,
ADD COLUMN IF NOT EXISTS gibbs_analysis TEXT,
ADD COLUMN IF NOT EXISTS gibbs_conclusion TEXT,
ADD COLUMN IF NOT EXISTS gibbs_action_plan TEXT,
ADD COLUMN IF NOT EXISTS reflection_type TEXT DEFAULT 'structured', -- 'structured', 'file', 'legacy'
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS score_exploration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_voice INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_description INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_emotions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_analysis INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_score INTEGER GENERATED ALWAYS AS (
  COALESCE(score_exploration, 0) + 
  COALESCE(score_voice, 0) + 
  COALESCE(score_description, 0) + 
  COALESCE(score_emotions, 0) + 
  COALESCE(score_analysis, 0)
) STORED;

-- 2. Ensure teacher_student_mappings has a notes column (for general feedback)
ALTER TABLE teacher_student_mappings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create Storage Bucket for Reflection Files
-- Note: You might need to create the 'reflection-files' bucket manually in the Supabase Dashboard if this fails
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reflection-files', 'reflection-files', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies (Security)

-- Allow authenticated users to view all files (needed for mentors to see student files)
CREATE POLICY "Public Access to Reflection Files"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'reflection-files' );

-- Allow students to upload their own files
CREATE POLICY "Students can upload reflection files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reflection-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to update/delete their own files
CREATE POLICY "Students can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reflection-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reflection-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
