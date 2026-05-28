-- =========================================================
-- FAP NextGen - DPDP / Health Data / AI Consent Acceptance
-- Additive patch: does not modify existing feature tables.
-- Run in Supabase SQL Editor before enabling consent UI in production.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.compliance_consent_documents (
  version text PRIMARY KEY,
  title text NOT NULL,
  effective_date date NOT NULL,
  body jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_consent_acceptances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_version text NOT NULL REFERENCES public.compliance_consent_documents(version),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  acceptance_source text NOT NULL CHECK (
    acceptance_source IN (
      'signup',
      'settings',
      'migration_existing_user',
      'admin_recorded'
    )
  ),
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_consent_acceptances_user
  ON public.user_consent_acceptances(user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_consent_acceptances_version
  ON public.user_consent_acceptances(consent_version, accepted_at DESC);

ALTER TABLE public.compliance_consent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read current consent documents"
  ON public.compliance_consent_documents;
CREATE POLICY "Authenticated users can read current consent documents"
  ON public.compliance_consent_documents
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read own consent acceptances"
  ON public.user_consent_acceptances;
CREATE POLICY "Users can read own consent acceptances"
  ON public.user_consent_acceptances
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own consent acceptances"
  ON public.user_consent_acceptances;
CREATE POLICY "Users can insert own consent acceptances"
  ON public.user_consent_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert consent acceptances"
  ON public.user_consent_acceptances;
CREATE POLICY "Admins can insert consent acceptances"
  ON public.user_consent_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.is_active = true
    )
  );

GRANT SELECT ON public.compliance_consent_documents TO authenticated;
GRANT SELECT, INSERT ON public.user_consent_acceptances TO authenticated;

INSERT INTO public.compliance_consent_documents (
  version,
  title,
  effective_date,
  body,
  is_current
)
VALUES (
  'fap-dpdp-health-ai-v1-2026-05-28',
  'FAP NextGen Digital Consent, Privacy and Responsible Use Notice',
  DATE '2026-05-28',
  '{
    "summary": [
      "FAP NextGen processes profile, academic and FAP records for educational, mentoring, reporting and approved research purposes.",
      "Family, member, visit, health measurement and reflection data may include personal and health-related information.",
      "The app applies role-based access, audit logs, DPDP-aligned privacy safeguards and institutional review processes.",
      "AI features are learning and decision-support tools only, not substitutes for qualified clinical judgement.",
      "Aggregated or anonymised data may be used for quality improvement, grant reporting, publications or ethics-approved research.",
      "App data may be stored in Supabase cloud databases, browser/device cache for offline use, protected logs, exports and approved backups according to institutional policy."
    ]
  }'::jsonb,
  true
)
ON CONFLICT (version) DO UPDATE SET
  title = EXCLUDED.title,
  effective_date = EXCLUDED.effective_date,
  body = EXCLUDED.body,
  is_current = true;

UPDATE public.compliance_consent_documents
SET is_current = (version = 'fap-dpdp-health-ai-v1-2026-05-28');

-- Backfill existing signed-up users as already accepted/provided for this version.
INSERT INTO public.user_consent_acceptances (
  user_id,
  consent_version,
  accepted_at,
  acceptance_source,
  user_agent,
  metadata
)
SELECT
  p.id,
  'fap-dpdp-health-ai-v1-2026-05-28',
  COALESCE(p.created_at, now()),
  'migration_existing_user',
  'system-backfill',
  jsonb_build_object(
    'reason', 'Existing signed-up user marked as provided/agreed during consent governance rollout',
    'role', p.role,
    'username', p.username
  )
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_consent_acceptances uca
  WHERE uca.user_id = p.id
    AND uca.consent_version = 'fap-dpdp-health-ai-v1-2026-05-28'
);

SELECT
  'Consent governance patch complete' AS status,
  COUNT(*) FILTER (WHERE consent_version = 'fap-dpdp-health-ai-v1-2026-05-28') AS accepted_users
FROM public.user_consent_acceptances;
