-- Add year_of_joining to student profiles (safe, idempotent)
-- Run in Supabase SQL editor for existing deployments.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS year_of_joining integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'year_of_joining'
  ) THEN
    ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_year_of_joining_check;

    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_year_of_joining_check
    CHECK (year_of_joining IS NULL OR (year_of_joining BETWEEN 2000 AND 2100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_year_of_joining
ON public.profiles(year_of_joining);

COMMENT ON COLUMN public.profiles.year_of_joining
IS 'Student batch year (e.g., 2025). Preferred over legacy year column.';

