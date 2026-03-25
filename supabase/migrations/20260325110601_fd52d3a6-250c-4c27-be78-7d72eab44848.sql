-- Fix parcelles visibility for team members receiving lots via sub-distribution
-- The current SELECT policy does not account for beneficiaires_lots.member_user_id,
-- so attributed lots remain invisible to the linked team member.

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
    );
$$;

DROP POLICY IF EXISTS "Users can view accessible parcelles" ON public.parcelles;

CREATE POLICY "Users can view accessible parcelles"
ON public.parcelles
FOR SELECT
USING (
  public.can_access_parcelle(
    auth.uid(),
    user_id,
    assigned_to,
    beneficiaire_id
  )
);