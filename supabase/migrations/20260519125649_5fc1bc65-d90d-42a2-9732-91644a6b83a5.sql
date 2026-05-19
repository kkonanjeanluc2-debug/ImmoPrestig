-- Fix infinite RLS recursion between parcelles and ventes_parcelles
-- by moving cross-table access checks into SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.can_view_parcelle_for_own_sale(
  _user_id uuid,
  _parcelle_id uuid,
  _owner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ventes_parcelles vp
    JOIN public.agencies a ON a.user_id = _owner_id
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE vp.parcelle_id = _parcelle_id
      AND vp.sold_by = _user_id
      AND am.user_id = _user_id
      AND am.role = 'gestionnaire'::app_role
      AND am.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_vente_parcelle_safe(
  _user_id uuid,
  _vente_user_id uuid,
  _sold_by uuid,
  _parcelle_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _user_id = _vente_user_id
    OR _user_id = _sold_by
    OR EXISTS (
      SELECT 1
      FROM public.parcelles p
      WHERE p.id = _parcelle_id
        AND (p.assigned_to = _user_id OR p.user_id = _user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      WHERE a.user_id = _user_id
        AND EXISTS (
          SELECT 1
          FROM public.agency_members am
          WHERE am.agency_id = a.id
            AND am.user_id = _vente_user_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = ANY (ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
        AND am.status = 'active'
    )
$$;

DROP POLICY IF EXISTS "Commercials can view parcelles for their own sales" ON public.parcelles;
CREATE POLICY "Commercials can view parcelles for their own sales"
ON public.parcelles
FOR SELECT
USING (public.can_view_parcelle_for_own_sale(auth.uid(), id, user_id));

DROP POLICY IF EXISTS "Users can view accessible ventes_parcelles" ON public.ventes_parcelles;
CREATE POLICY "Users can view accessible ventes_parcelles"
ON public.ventes_parcelles
FOR SELECT
USING (public.can_access_vente_parcelle_safe(auth.uid(), user_id, sold_by, parcelle_id));