-- Individual Assessments Normalization + Linkages (idempotent)
-- Purpose:
-- 1) Add normalized member-level assessment table for longitudinal tracking
-- 2) Backfill from family_members.health_data.assessments
-- 3) Keep strict RLS aligned to family ownership/assignment

BEGIN;

CREATE TABLE IF NOT EXISTS public.individual_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_fields jsonb,
  legacy_assessment_id text,
  source text NOT NULL DEFAULT 'member_details',
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_individual_assessments_member_date
  ON public.individual_assessments(member_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_individual_assessments_family
  ON public.individual_assessments(family_id);

CREATE INDEX IF NOT EXISTS idx_individual_assessments_form
  ON public.individual_assessments(form_id);

CREATE INDEX IF NOT EXISTS idx_individual_assessments_active
  ON public.individual_assessments(is_deleted);

-- Best-effort de-duplication for backfill + repeat runs
CREATE UNIQUE INDEX IF NOT EXISTS uq_individual_assessments_legacy
  ON public.individual_assessments(member_id, form_id, assessment_date, legacy_assessment_id)
  WHERE legacy_assessment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_individual_assessments_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  NEW.version = COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_individual_assessments_audit_fields ON public.individual_assessments;
CREATE TRIGGER trg_individual_assessments_audit_fields
BEFORE UPDATE ON public.individual_assessments
FOR EACH ROW
EXECUTE FUNCTION public.set_individual_assessments_audit_fields();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'audit_row_changes'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_individual_assessments_row_audit ON public.individual_assessments;
    CREATE TRIGGER trg_individual_assessments_row_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.individual_assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_row_changes();
  END IF;
END $$;

-- Backfill normalized table from legacy health_data.assessments
INSERT INTO public.individual_assessments (
  member_id,
  family_id,
  form_id,
  assessment_date,
  payload,
  calculated_fields,
  legacy_assessment_id,
  source,
  created_at,
  updated_at
)
SELECT
  fm.id AS member_id,
  fm.family_id,
  COALESCE(a.elem->>'formId', 'unknown') AS form_id,
  CASE
    WHEN COALESCE(a.elem->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN (a.elem->>'date')::date
    ELSE CURRENT_DATE
  END AS assessment_date,
  COALESCE(a.elem->'data', '{}'::jsonb) AS payload,
  a.elem->'calculated_fields' AS calculated_fields,
  NULLIF(a.elem->>'id', '') AS legacy_assessment_id,
  'legacy_health_data' AS source,
  now(),
  now()
FROM public.family_members fm
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fm.health_data->'assessments', '[]'::jsonb)) AS a(elem)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.individual_assessments ia
  WHERE ia.member_id = fm.id
    AND ia.form_id = COALESCE(a.elem->>'formId', 'unknown')
    AND ia.assessment_date = CASE
      WHEN COALESCE(a.elem->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN (a.elem->>'date')::date
      ELSE CURRENT_DATE
    END
    AND COALESCE(ia.legacy_assessment_id, '') = COALESCE(NULLIF(a.elem->>'id', ''), '')
);

ALTER TABLE public.individual_assessments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'individual_assessments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.individual_assessments', p.policyname);
  END LOOP;
END $$;

-- Students: full CRUD only for members in own families
CREATE POLICY individual_assessments_student_select_own
ON public.individual_assessments
FOR SELECT
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY individual_assessments_student_insert_own
ON public.individual_assessments
FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY individual_assessments_student_update_own
ON public.individual_assessments
FOR UPDATE
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
)
WITH CHECK (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

CREATE POLICY individual_assessments_student_delete_own
ON public.individual_assessments
FOR DELETE
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id = auth.uid()
  )
);

-- Teachers: read-only for assigned students
CREATE POLICY individual_assessments_teacher_read_assigned
ON public.individual_assessments
FOR SELECT
USING (
  family_id IN (
    SELECT f.id
    FROM public.families f
    WHERE f.student_id IN (
      SELECT tsm.student_id
      FROM public.teacher_student_mappings tsm
      WHERE tsm.teacher_id = auth.uid()
        AND tsm.is_active = true
    )
  )
);

-- Admins: full access
CREATE POLICY individual_assessments_admin_all
ON public.individual_assessments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

COMMIT;
