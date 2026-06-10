-- Secure DEFINER function so any active agency member (including commercials)
-- can register a prefinancement without being blocked by RLS.
CREATE OR REPLACE FUNCTION public.enregistrer_prefinancement(
  _parcelle_id   uuid,
  _prefinanceur_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_user_id uuid;
  _authorized    boolean;
BEGIN
  SELECT user_id INTO _owner_user_id
  FROM public.parcelles
  WHERE id = _parcelle_id AND deleted_at IS NULL;

  IF _owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Parcelle introuvable';
  END IF;

  -- Authorized if: caller is the owner OR an active member of the owner's agency
  SELECT (
    auth.uid() = _owner_user_id
    OR EXISTS (
      SELECT 1
      FROM public.agencies   a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id   = _owner_user_id
        AND am.user_id  = auth.uid()
        AND am.status   = 'active'
    )
  ) INTO _authorized;

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Non autorisé à modifier cette parcelle';
  END IF;

  UPDATE public.parcelles
  SET
    status          = 'prefinance',
    prefinanceur_id = _prefinanceur_id
  WHERE id = _parcelle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_prefinancement(uuid, uuid) TO authenticated;
