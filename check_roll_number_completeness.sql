-- Read-only diagnostic: roll-number completeness for active students
-- Safe to run in Supabase SQL editor (no writes).

-- 1) Summary counts
SELECT
  count(*) AS total_active_students,
  count(*) FILTER (
    WHERE coalesce(nullif(trim(registration_number), ''), '') <> ''
  ) AS students_with_roll_number,
  count(*) FILTER (
    WHERE coalesce(nullif(trim(registration_number), ''), '') = ''
  ) AS students_missing_roll_number
FROM public.profiles
WHERE role = 'student'
  AND is_active = true;

-- 2) Missing roll-number list (for cleanup)
SELECT
  id,
  full_name,
  username,
  registration_number,
  year_of_joining,
  year
FROM public.profiles
WHERE role = 'student'
  AND is_active = true
  AND coalesce(nullif(trim(registration_number), ''), '') = ''
ORDER BY full_name;
