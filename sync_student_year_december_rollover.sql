-- Recalculate student `year` using December rollover academic logic.
-- Rule: Batch 2025 remains Year 1 through Nov 2026; becomes Year 2 from Dec 2026.
-- Safe/idempotent.

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
