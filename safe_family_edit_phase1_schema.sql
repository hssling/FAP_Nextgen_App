-- Phase 1: Safe edit foundations (idempotent)
-- Adds soft-delete fields, optimistic locking version, and audit logging.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Families table hardening
ALTER TABLE IF EXISTS public.families
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2) Family members table hardening
ALTER TABLE IF EXISTS public.family_members
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS merged_into_member_id uuid REFERENCES public.family_members(id),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Audit trail table
CREATE TABLE IF NOT EXISTS public.data_change_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  acted_by uuid,
  acted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_change_log_table_row
  ON public.data_change_log(table_name, row_id, acted_at DESC);

-- 4) Trigger function to maintain updated_at + version
CREATE OR REPLACE FUNCTION public.set_updated_at_and_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$;

-- 5) Trigger function to capture row change audit
CREATE OR REPLACE FUNCTION public.audit_row_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id;
    INSERT INTO public.data_change_log(table_name, row_id, action, old_data, new_data, acted_by)
    VALUES (TG_TABLE_NAME, v_row_id, TG_OP, to_jsonb(OLD), NULL, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_row_id := NEW.id;
    INSERT INTO public.data_change_log(table_name, row_id, action, old_data, new_data, acted_by)
    VALUES (TG_TABLE_NAME, v_row_id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSE
    v_row_id := NEW.id;
    INSERT INTO public.data_change_log(table_name, row_id, action, old_data, new_data, acted_by)
    VALUES (TG_TABLE_NAME, v_row_id, TG_OP, NULL, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- 6) Attach triggers: families
DROP TRIGGER IF EXISTS trg_families_set_updated_at_and_version ON public.families;
CREATE TRIGGER trg_families_set_updated_at_and_version
BEFORE UPDATE ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_families_audit_changes ON public.families;
CREATE TRIGGER trg_families_audit_changes
AFTER INSERT OR UPDATE OR DELETE ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.audit_row_changes();

-- 7) Attach triggers: family_members
DROP TRIGGER IF EXISTS trg_family_members_set_updated_at_and_version ON public.family_members;
CREATE TRIGGER trg_family_members_set_updated_at_and_version
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_family_members_audit_changes ON public.family_members;
CREATE TRIGGER trg_family_members_audit_changes
AFTER INSERT OR UPDATE OR DELETE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_row_changes();

COMMIT;
