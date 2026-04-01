
-- Update the 4-arg version of can_access_parcelle to allow gestionnaires to see all 'disponible' parcelles in their agency
CREATE OR REPLACE FUNCTION public.can_access_parcelle(
  _user_id uuid,
  _parcelle_user_id uuid,
  _assigned_to uuid,
  _beneficiaire_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _parcelle_user_id
    OR _user_id = _assigned_to
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.beneficiaires_lots bl
      WHERE bl.id = _beneficiaire_id
        AND bl.member_user_id = _user_id
        AND bl.user_id = _parcelle_user_id
    )
    -- Caissière can access all parcelles in agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    -- Gestionnaires can see all 'disponible' parcelles in their agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      JOIN public.parcelles p ON p.user_id = _parcelle_user_id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'gestionnaire'::app_role
        AND am.status = 'active'
        AND p.assigned_to = _assigned_to
        AND p.beneficiaire_id IS NOT DISTINCT FROM _beneficiaire_id
        AND p.status = 'disponible'
    )
$$;
