
-- 1. Update can_gestionnaire_access_vente_immo to include comptable
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_immo(_user_id uuid, _vente_user_id uuid, _bien_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.biens_vente bv
      WHERE bv.id = _bien_id
        AND public.can_gestionnaire_access_bien_vente(_user_id, bv.user_id, bv.assigned_to)
    )
    OR (
      _user_id = _vente_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _vente_user_id
    )
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
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'comptable'::app_role
        AND am.status = 'active'
    )
$function$;

-- 2. Update can_gestionnaire_access_echeance_achat to include comptable
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_echeance_achat(_user_id uuid, _echeance_user_id uuid, _achat_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _user_id = _echeance_user_id
    OR EXISTS (
      SELECT 1 FROM achats_immobiliers ai
      JOIN biens_achat ba ON ba.id = ai.bien_id
      WHERE ai.id = _achat_id
      AND ba.assigned_to = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _echeance_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _echeance_user_id
    )
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _echeance_user_id
      AND am.user_id = _user_id
      AND am.role = 'caissiere'::app_role
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _echeance_user_id
      AND am.user_id = _user_id
      AND am.role = 'comptable'::app_role
      AND am.status = 'active'
    )
$function$;

-- 3. Update can_access_vente_parcelle to include comptable
CREATE OR REPLACE FUNCTION public.can_access_vente_parcelle(_user_id uuid, _vente_user_id uuid, _sold_by uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _vente_user_id
    OR _user_id = _sold_by
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR (
      _sold_by IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'comptable'::app_role
        AND am.status = 'active'
    )
$function$;

-- 4. echeances_parcelles SELECT policy: include comptable
DROP POLICY IF EXISTS "Users can view accessible echeances_parcelles" ON public.echeances_parcelles;
CREATE POLICY "Users can view accessible echeances_parcelles"
ON public.echeances_parcelles
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    JOIN parcelles p ON p.id = vp.parcelle_id
    WHERE vp.id = echeances_parcelles.vente_id
      AND (
        p.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM agencies a
          JOIN agency_members am ON am.agency_id = a.id
          WHERE a.user_id = vp.user_id
            AND am.user_id = auth.uid()
            AND am.role = ANY (ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
            AND am.status = 'active'
        )
      )
  )
);

-- 5. ventes_parcelles SELECT policy: include comptable
DROP POLICY IF EXISTS "Users can view accessible ventes_parcelles" ON public.ventes_parcelles;
CREATE POLICY "Users can view accessible ventes_parcelles"
ON public.ventes_parcelles
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM parcelles p
    WHERE p.id = ventes_parcelles.parcelle_id
      AND (p.assigned_to = auth.uid() OR p.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM agency_members am
        WHERE am.agency_id = a.id AND am.user_id = ventes_parcelles.user_id
      )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = ventes_parcelles.user_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ventes_parcelles.user_id
      AND am.user_id = auth.uid()
      AND am.role = ANY (ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
      AND am.status = 'active'
  )
);

-- 6. expenses SELECT policy: include comptable explicitly (also caissiere)
DROP POLICY IF EXISTS "Users can view expenses based on role" ON public.expenses;
CREATE POLICY "Users can view expenses based on role"
ON public.expenses
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
      AND (
        expenses.user_id = a.user_id
        OR EXISTS (
          SELECT 1 FROM agency_members am
          WHERE am.agency_id = a.id AND am.user_id = expenses.user_id AND am.status = 'active'
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = auth.uid()
      AND am.role = ANY (ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
      AND am.status = 'active'
      AND (
        expenses.user_id = a.user_id
        OR EXISTS (
          SELECT 1 FROM agency_members am2
          WHERE am2.agency_id = a.id AND am2.user_id = expenses.user_id
        )
      )
  )
);
