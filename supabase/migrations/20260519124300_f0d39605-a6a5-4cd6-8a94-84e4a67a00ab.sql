
-- 1. Update can_gestionnaire_access_vente_immo so gestionnaires only see their own sales
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_immo(_user_id uuid, _vente_user_id uuid, _bien_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Owner of the agency
    (
      _user_id = _vente_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )
    -- User is the agency owner viewing his team's sales
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _vente_user_id
    )
    -- Admin member of the agency
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR public.is_super_admin(_user_id)
    -- Caissière full visibility
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    -- Comptable full visibility
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'comptable'::app_role
        AND am.status = 'active'
    )
    -- Gestionnaire (commercial) : only sales they recorded themselves
    OR EXISTS (
      SELECT 1
      FROM public.ventes_immobilieres v
      JOIN public.agencies a ON a.user_id = v.user_id
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE v.id IS NOT NULL
        AND v.user_id = _vente_user_id
        AND v.bien_id = _bien_id
        AND v.sold_by = _user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
    )
$function$;

-- 2. Restrict the granular-permission SELECT policy for non-admin members to their own sales
DROP POLICY IF EXISTS "Members with view ventes can read" ON public.ventes_immobilieres;
CREATE POLICY "Members with view ventes can read"
ON public.ventes_immobilieres
FOR SELECT
USING (
  has_member_permission_for_user(auth.uid(), user_id, 'can_view_ventes'::text)
  AND (
    -- Admins / owners / caissiere / comptable keep full visibility
    public.is_admin_of_owner(auth.uid(), user_id)
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      JOIN public.agencies a ON a.id = am.agency_id
      WHERE am.user_id = auth.uid()
        AND am.status = 'active'
        AND am.role IN ('admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role)
        AND (a.user_id = ventes_immobilieres.user_id
             OR EXISTS (
               SELECT 1 FROM public.agency_members am2
               WHERE am2.agency_id = am.agency_id
                 AND am2.user_id = ventes_immobilieres.user_id
                 AND am2.status = 'active'
             ))
    )
    -- Other roles (commercial/gestionnaire) only their own sales
    OR sold_by = auth.uid()
  )
);
