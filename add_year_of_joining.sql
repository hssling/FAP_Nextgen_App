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

-- Business rule (current deployment): all existing Year-1 students belong to 2025 batch.
UPDATE public.profiles
SET year_of_joining = 2025
WHERE role = 'student'
  AND year = 1
  AND (year_of_joining IS NULL OR year_of_joining <> 2025);

-- Keep legacy year aligned from year_of_joining for competency/year progression.
UPDATE public.profiles
SET year = LEAST(
  3,
  GREATEST(
    1,
    (
      CASE
        WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int >= 12 THEN EXTRACT(YEAR FROM CURRENT_DATE)::int
        ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int - 1
      END
    ) - year_of_joining + 1
  )
)
WHERE role = 'student'
  AND year_of_joining IS NOT NULL
  AND year IS DISTINCT FROM LEAST(
    3,
    GREATEST(
      1,
      (
        CASE
          WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int >= 12 THEN EXTRACT(YEAR FROM CURRENT_DATE)::int
          ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int - 1
        END
      ) - year_of_joining + 1
    )
  );
