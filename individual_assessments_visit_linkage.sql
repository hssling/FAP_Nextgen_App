-- Individual Assessments <-> Visit Log Auto Linkage (idempotent)
-- Purpose:
-- 1) Add visit_id link on individual assessments
-- 2) Backfill links to existing visits where possible
-- 3) Create missing visit log rows for assessments not represented in family_visits

BEGIN;

ALTER TABLE IF EXISTS public.individual_assessments
  ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES public.family_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_individual_assessments_visit_id
  ON public.individual_assessments(visit_id);

-- Step 1: Link to already existing matching visits (same family/member/date/protocol)
WITH ranked_matches AS (
  SELECT
    ia.id AS assessment_id,
    fv.id AS visit_id,
    ROW_NUMBER() OVER (
      PARTITION BY ia.id
      ORDER BY fv.created_at DESC, fv.id DESC
    ) AS rn
  FROM public.individual_assessments ia
  JOIN public.family_visits fv
    ON fv.family_id = ia.family_id
   AND fv.visit_date = ia.assessment_date
   AND COALESCE(fv.data->>'member_id', '') = ia.member_id::text
   AND COALESCE(fv.data->>'protocol', '') = ia.form_id
  WHERE ia.visit_id IS NULL
    AND COALESCE(ia.is_deleted, false) = false
)
UPDATE public.individual_assessments ia
SET visit_id = rm.visit_id
FROM ranked_matches rm
WHERE ia.id = rm.assessment_id
  AND rm.rn = 1;

-- Step 2: Create visit entries for assessments still unlinked
WITH missing AS (
  SELECT
    ia.id AS assessment_id,
    ia.family_id,
    ia.member_id,
    ia.assessment_date,
    ia.form_id,
    f.student_id
  FROM public.individual_assessments ia
  JOIN public.families f ON f.id = ia.family_id
  WHERE ia.visit_id IS NULL
    AND COALESCE(ia.is_deleted, false) = false
),
inserted AS (
  INSERT INTO public.family_visits (
    family_id,
    student_id,
    visit_date,
    notes,
    activity_type,
    data
  )
  SELECT
    m.family_id,
    m.student_id,
    m.assessment_date,
    'Auto-generated from individual assessment migration',
    'Assessment Entry',
    jsonb_build_object(
      'protocol', m.form_id,
      'member_id', m.member_id::text,
      'assessment_id', m.assessment_id::text,
      'auto_generated_from_assessment', true,
      'source', 'individual_assessments_backfill'
    )
  FROM missing m
  RETURNING id, family_id, visit_date, data
),
mapped AS (
  SELECT
    (i.data->>'assessment_id')::uuid AS assessment_id,
    i.id AS visit_id
  FROM inserted i
)
UPDATE public.individual_assessments ia
SET visit_id = m.visit_id
FROM mapped m
WHERE ia.id = m.assessment_id
  AND ia.visit_id IS NULL;

COMMIT;
