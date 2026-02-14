-- Reflection AI Extraction metadata columns
-- Run in Supabase SQL editor after supabase_reflections_v2.sql

ALTER TABLE reflections
ADD COLUMN IF NOT EXISTS ai_extraction_status TEXT DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS ai_extraction_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_extraction_model TEXT,
ADD COLUMN IF NOT EXISTS ai_extraction_confidence JSONB,
ADD COLUMN IF NOT EXISTS ai_extraction_missing_sections TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_extraction_flags JSONB,
ADD COLUMN IF NOT EXISTS ai_extracted_text TEXT,
ADD COLUMN IF NOT EXISTS ai_extraction_error TEXT,
ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP WITH TIME ZONE;
