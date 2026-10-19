-- Migration: Field Distribution & Beneficiary Scanning Module
-- Adds atomic distribution transaction, idempotency guarantees, and duplicate prevention RPC.

-- 1. Extend assistance_records with field scanning metadata
ALTER TABLE public.assistance_records
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS override_by uuid references auth.users(id) on delete set null,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz default now();

-- Unique constraint on idempotency_key per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_assistance_idempotency
  ON public.assistance_records (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Fast index for duplicate checking (same beneficiary, same type, same date)
CREATE INDEX IF NOT EXISTS idx_assistance_duplicate_check
  ON public.assistance_records (organization_id, beneficiary_id, assistance_type, distribution_date);

-- Fast index for beneficiary code lookup
CREATE INDEX IF NOT EXISTS idx_beneficiaries_org_code
  ON public.beneficiaries (organization_id, code);

-- 2. Atomic Server-Side Function for Secure Distribution
CREATE OR REPLACE FUNCTION public.record_field_distribution(
  _org_id uuid,
  _beneficiary_id uuid,
  _assistance_type text,
  _quantity numeric DEFAULT 1,
  _unit text DEFAULT NULL,
  _estimated_value numeric DEFAULT NULL,
  _project_id uuid DEFAULT NULL,
  _campaign_name text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _distribution_date date DEFAULT current_date,
  _idempotency_key text DEFAULT NULL,
  _override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller_role public.org_role;
  _ben record;
  _existing record;
  _new_id uuid;
  _ref text;
  _inserted record;
BEGIN
  -- Authenticate caller
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has permission to dispense assistance (owner, admin, staff, project_manager)
  SELECT role INTO _caller_role FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _caller_id AND status = 'active'
  LIMIT 1;

  IF _caller_role IS NULL OR NOT (_caller_role = ANY (ARRAY['owner','admin','staff','project_manager']::public.org_role[])) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient organization permissions to distribute assistance';
  END IF;

  -- Validate beneficiary belongs to the organization
  SELECT id, full_name, code, status INTO _ben FROM public.beneficiaries
  WHERE id = _beneficiary_id AND organization_id = _org_id
  LIMIT 1;

  IF _ben.id IS NULL THEN
    RAISE EXCEPTION 'Beneficiary not found in this organization';
  END IF;

  IF _ben.status NOT IN ('active', 'graduated') THEN
    RAISE EXCEPTION 'Cannot distribute to inactive or archived beneficiary (%)', _ben.status;
  END IF;

  -- Idempotency check: if key already exists, return previous record safely
  IF _idempotency_key IS NOT NULL AND length(_idempotency_key) > 0 THEN
    SELECT * INTO _existing FROM public.assistance_records
    WHERE organization_id = _org_id AND idempotency_key = _idempotency_key
    LIMIT 1;

    IF _existing.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'record', row_to_json(_existing)
      );
    END IF;
  END IF;

  -- Validate quantity
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Distribution quantity must be greater than zero';
  END IF;

  -- Server-side Duplicate Prevention Check
  -- Check if same beneficiary received this exact assistance type on this date
  SELECT id, reference, assistance_type, distribution_date, quantity, unit INTO _existing
  FROM public.assistance_records
  WHERE organization_id = _org_id
    AND beneficiary_id = _beneficiary_id
    AND lower(trim(assistance_type)) = lower(trim(_assistance_type))
    AND distribution_date = _distribution_date
    AND status IN ('distributed', 'planned')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _existing.id IS NOT NULL THEN
    -- If duplicate found and no valid override reason provided, block and warn
    IF _override_reason IS NULL OR length(trim(_override_reason)) < 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'duplicate_detected', true,
        'message', format('Duplicate: %s already received %s on %s (Ref: %s)', _ben.full_name, _existing.assistance_type, _existing.distribution_date, _existing.reference),
        'existing_record', row_to_json(_existing)
      );
    END IF;

    -- If override requested, enforce role authorization
    IF _caller_role NOT IN ('owner', 'admin', 'project_manager') THEN
      RAISE EXCEPTION 'Only owners, admins, or project managers can authorize duplicate distribution overrides';
    END IF;
  END IF;

  -- Generate unique reference
  _ref := 'AST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  -- Insert atomic assistance record
  INSERT INTO public.assistance_records (
    organization_id,
    reference,
    beneficiary_id,
    project_id,
    assistance_type,
    description,
    quantity,
    unit,
    estimated_value,
    distribution_date,
    responsible_user_id,
    campaign_name,
    notes,
    status,
    idempotency_key,
    override_reason,
    override_by,
    created_by,
    updated_by,
    verified_at
  ) VALUES (
    _org_id,
    _ref,
    _beneficiary_id,
    _project_id,
    _assistance_type,
    _campaign_name,
    _quantity,
    _unit,
    _estimated_value,
    _distribution_date,
    _caller_id,
    _campaign_name,
    _notes,
    'distributed',
    _idempotency_key,
    _override_reason,
    CASE WHEN _override_reason IS NOT NULL THEN _caller_id ELSE NULL END,
    _caller_id,
    _caller_id,
    now()
  )
  RETURNING * INTO _inserted;

  -- Insert audit log into activity_logs
  INSERT INTO public.activity_logs (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    summary,
    changes
  ) VALUES (
    _org_id,
    _caller_id,
    'create',
    'assistance_records',
    _inserted.id,
    format('Distributed %s %s of %s to %s (%s)', _quantity, coalesce(_unit, 'unit(s)'), _assistance_type, _ben.full_name, _ref),
    jsonb_build_object(
      'beneficiary_id', _beneficiary_id,
      'reference', _ref,
      'assistance_type', _assistance_type,
      'override_reason', _override_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate_detected', false,
    'record', row_to_json(_inserted)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_field_distribution FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_field_distribution TO authenticated;
