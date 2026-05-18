-- Individual Assessments Validation + Optional Duplicate Guard
-- Safe to run after individual_assessments_linkages.sql and individual_assessments_visit_linkage.sql.
-- This reports duplicate keys and creates a non-legacy unique guard only when no duplicates exist.

-- 1) Active duplicate assessment keys by member/form/date.
SELECT
  member_id,
  form_id,
  assessment_date,
  COALESCE(legacy_assessment_id, '') AS legacy_assessment_id,
  count(*) AS duplicate_count
FROM public.individual_assessments
WHERE COALESCE(is_deleted, false) = false
GROUP BY member_id, form_id, assessment_date, COALESCE(legacy_assessment_id, '')
HAVING count(*) > 1
ORDER BY duplicate_count DESC, assessment_date DESC;

-- 2) Assessments missing visit links.
SELECT
  count(*) AS active_assessments_without_visit_link
FROM public.individual_assessments
WHERE COALESCE(is_deleted, false) = false
  AND visit_id IS NULL;

-- 3) Auto-generated visit entries that point back to assessments.
SELECT
  count(*) AS auto_generated_assessment_visits
FROM public.family_visits
WHERE data->>'auto_generated_from_assessment' = 'true';

-- 4) Create a unique guard for new non-legacy active records only if it will not fail.
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT member_id, form_id, assessment_date, count(*) AS n
    FROM public.individual_assessments
    WHERE COALESCE(is_deleted, false) = false
      AND legacy_assessment_id IS NULL
    GROUP BY member_id, form_id, assessment_date
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_individual_assessments_active_member_form_date
      ON public.individual_assessments(member_id, form_id, assessment_date)
      WHERE COALESCE(is_deleted, false) = false
        AND legacy_assessment_id IS NULL;
  ELSE
    RAISE NOTICE 'Skipped unique guard: % duplicate active non-legacy assessment key(s) found.', duplicate_count;
  END IF;
END $$;
