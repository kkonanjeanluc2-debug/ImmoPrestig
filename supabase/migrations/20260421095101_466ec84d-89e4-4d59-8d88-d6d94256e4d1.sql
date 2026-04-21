-- ============================================================
-- 1. Enable Supabase Vault extension for encrypted storage
-- ============================================================
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ============================================================
-- 2. Create dedicated table holding only Vault secret references
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_payment_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  -- Vault secret IDs (UUIDs pointing to vault.secrets); never store the secret itself.
  kkiapay_secret_vault_id uuid,
  kkiapay_private_key_vault_id uuid,
  wave_api_key_vault_id uuid,
  wave_webhook_secret_vault_id uuid,
  geniuspay_secret_key_vault_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_payment_credentials ENABLE ROW LEVEL SECURITY;

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS update_agency_payment_credentials_updated_at ON public.agency_payment_credentials;
CREATE TRIGGER update_agency_payment_credentials_updated_at
BEFORE UPDATE ON public.agency_payment_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Strict RLS: only agency OWNER or AGENCY ADMIN can access.
--    The columns themselves only contain Vault IDs (no secret), so even
--    in the worst case nothing usable leaks.
-- ============================================================

-- Helper that returns true if _user_id is owner OR admin member of _agency_id
CREATE OR REPLACE FUNCTION public.is_agency_owner_or_admin_for(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = _agency_id AND a.user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = _agency_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
$$;

CREATE POLICY "Owner/admin can read payment credential refs"
ON public.agency_payment_credentials
FOR SELECT
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

CREATE POLICY "Owner/admin can insert payment credential refs"
ON public.agency_payment_credentials
FOR INSERT
TO authenticated
WITH CHECK (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

CREATE POLICY "Owner/admin can update payment credential refs"
ON public.agency_payment_credentials
FOR UPDATE
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), agency_id))
WITH CHECK (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

CREATE POLICY "Owner/admin can delete payment credential refs"
ON public.agency_payment_credentials
FOR DELETE
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

-- ============================================================
-- 4. SECURITY DEFINER helpers to set / get / delete encrypted secrets
--    via Vault, gated on owner/admin authorisation.
-- ============================================================

-- Set (or rotate) an encrypted payment secret for an agency.
-- _field must be one of: kkiapay_secret, kkiapay_private_key,
--   wave_api_key, wave_webhook_secret, geniuspay_secret_key
CREATE OR REPLACE FUNCTION public.set_agency_payment_secret(
  _agency_id uuid,
  _field text,
  _value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_existing_id uuid;
  v_new_id uuid;
  v_column text;
  v_secret_name text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_agency_owner_or_admin_for(v_caller, _agency_id) THEN
    RAISE EXCEPTION 'Not authorised to manage payment credentials for this agency';
  END IF;

  IF _field NOT IN (
    'kkiapay_secret','kkiapay_private_key',
    'wave_api_key','wave_webhook_secret','geniuspay_secret_key'
  ) THEN
    RAISE EXCEPTION 'Invalid credential field: %', _field;
  END IF;

  v_column := _field || '_vault_id';
  v_secret_name := 'agency_' || _agency_id::text || '_' || _field;

  -- Ensure a row exists for this agency
  INSERT INTO public.agency_payment_credentials (agency_id)
  VALUES (_agency_id)
  ON CONFLICT (agency_id) DO NOTHING;

  EXECUTE format(
    'SELECT %I FROM public.agency_payment_credentials WHERE agency_id = $1',
    v_column
  ) INTO v_existing_id USING _agency_id;

  IF _value IS NULL OR length(btrim(_value)) = 0 THEN
    -- Clearing the secret: remove from vault and null the reference
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing_id;
    END IF;
    EXECUTE format(
      'UPDATE public.agency_payment_credentials SET %I = NULL, updated_at = now() WHERE agency_id = $1',
      v_column
    ) USING _agency_id;
    RETURN;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, _value, v_secret_name, 'Agency payment credential');
  ELSE
    v_new_id := vault.create_secret(_value, v_secret_name, 'Agency payment credential');
    EXECUTE format(
      'UPDATE public.agency_payment_credentials SET %I = $1, updated_at = now() WHERE agency_id = $2',
      v_column
    ) USING v_new_id, _agency_id;
  END IF;
END;
$$;

-- Read an encrypted payment secret. Authorisation enforced inside.
CREATE OR REPLACE FUNCTION public.get_agency_payment_secret(
  _agency_id uuid,
  _field text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_vault_id uuid;
  v_column text;
  v_secret text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_agency_owner_or_admin_for(v_caller, _agency_id) THEN
    RAISE EXCEPTION 'Not authorised to read payment credentials for this agency';
  END IF;

  IF _field NOT IN (
    'kkiapay_secret','kkiapay_private_key',
    'wave_api_key','wave_webhook_secret','geniuspay_secret_key'
  ) THEN
    RAISE EXCEPTION 'Invalid credential field: %', _field;
  END IF;

  v_column := _field || '_vault_id';
  EXECUTE format(
    'SELECT %I FROM public.agency_payment_credentials WHERE agency_id = $1',
    v_column
  ) INTO v_vault_id USING _agency_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  RETURN v_secret;
END;
$$;

-- Server-side helper for edge functions (service role) to look up a
-- secret by agency owner user_id without bypassing logging. Uses owner
-- of the agency to identify the agency, which is a stable anchor.
CREATE OR REPLACE FUNCTION public.get_agency_payment_secret_by_owner(
  _owner_user_id uuid,
  _field text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_agency_id uuid;
  v_vault_id uuid;
  v_column text;
  v_secret text;
BEGIN
  IF _field NOT IN (
    'kkiapay_secret','kkiapay_private_key',
    'wave_api_key','wave_webhook_secret','geniuspay_secret_key'
  ) THEN
    RAISE EXCEPTION 'Invalid credential field: %', _field;
  END IF;

  SELECT id INTO v_agency_id
  FROM public.agencies
  WHERE user_id = _owner_user_id
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_column := _field || '_vault_id';
  EXECUTE format(
    'SELECT %I FROM public.agency_payment_credentials WHERE agency_id = $1',
    v_column
  ) INTO v_vault_id USING v_agency_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  RETURN v_secret;
END;
$$;

-- Lock down execution of the by_owner helper to service_role only
-- (edge functions). Authenticated users must use get_agency_payment_secret.
REVOKE EXECUTE ON FUNCTION public.get_agency_payment_secret_by_owner(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_agency_payment_secret_by_owner(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_agency_payment_secret_by_owner(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_agency_payment_secret_by_owner(uuid, text) TO service_role;

-- Authenticated users can call set/get only for their own agencies
GRANT EXECUTE ON FUNCTION public.set_agency_payment_secret(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agency_payment_secret(uuid, text) TO authenticated;

-- ============================================================
-- 5. Migrate existing plaintext secrets from agencies into Vault
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT id,
           kkiapay_secret, kkiapay_private_key,
           wave_api_key, wave_webhook_secret,
           geniuspay_secret_key
    FROM public.agencies
    WHERE kkiapay_secret IS NOT NULL
       OR kkiapay_private_key IS NOT NULL
       OR wave_api_key IS NOT NULL
       OR wave_webhook_secret IS NOT NULL
       OR geniuspay_secret_key IS NOT NULL
  LOOP
    INSERT INTO public.agency_payment_credentials (agency_id)
    VALUES (r.id)
    ON CONFLICT (agency_id) DO NOTHING;

    IF r.kkiapay_secret IS NOT NULL AND length(btrim(r.kkiapay_secret)) > 0 THEN
      v_id := vault.create_secret(r.kkiapay_secret,
        'agency_' || r.id::text || '_kkiapay_secret', 'Migrated from agencies');
      UPDATE public.agency_payment_credentials
        SET kkiapay_secret_vault_id = v_id WHERE agency_id = r.id;
    END IF;

    IF r.kkiapay_private_key IS NOT NULL AND length(btrim(r.kkiapay_private_key)) > 0 THEN
      v_id := vault.create_secret(r.kkiapay_private_key,
        'agency_' || r.id::text || '_kkiapay_private_key', 'Migrated from agencies');
      UPDATE public.agency_payment_credentials
        SET kkiapay_private_key_vault_id = v_id WHERE agency_id = r.id;
    END IF;

    IF r.wave_api_key IS NOT NULL AND length(btrim(r.wave_api_key)) > 0 THEN
      v_id := vault.create_secret(r.wave_api_key,
        'agency_' || r.id::text || '_wave_api_key', 'Migrated from agencies');
      UPDATE public.agency_payment_credentials
        SET wave_api_key_vault_id = v_id WHERE agency_id = r.id;
    END IF;

    IF r.wave_webhook_secret IS NOT NULL AND length(btrim(r.wave_webhook_secret)) > 0 THEN
      v_id := vault.create_secret(r.wave_webhook_secret,
        'agency_' || r.id::text || '_wave_webhook_secret', 'Migrated from agencies');
      UPDATE public.agency_payment_credentials
        SET wave_webhook_secret_vault_id = v_id WHERE agency_id = r.id;
    END IF;

    IF r.geniuspay_secret_key IS NOT NULL AND length(btrim(r.geniuspay_secret_key)) > 0 THEN
      v_id := vault.create_secret(r.geniuspay_secret_key,
        'agency_' || r.id::text || '_geniuspay_secret_key', 'Migrated from agencies');
      UPDATE public.agency_payment_credentials
        SET geniuspay_secret_key_vault_id = v_id WHERE agency_id = r.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 6. Drop sensitive columns from agencies (no longer needed)
-- ============================================================
ALTER TABLE public.agencies
  DROP COLUMN IF EXISTS kkiapay_secret,
  DROP COLUMN IF EXISTS kkiapay_private_key,
  DROP COLUMN IF EXISTS wave_api_key,
  DROP COLUMN IF EXISTS wave_webhook_secret,
  DROP COLUMN IF EXISTS geniuspay_secret_key;