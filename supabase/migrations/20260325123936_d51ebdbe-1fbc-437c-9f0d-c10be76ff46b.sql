-- Fix echeances_achats: add caissière access
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_echeance_achat(
  _user_id uuid,
  _echeance_user_id uuid,
  _achat_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix echeances_parcelles SELECT: add caissière access
DROP POLICY IF EXISTS "Users can view accessible echeances_parcelles" ON echeances_parcelles;
CREATE POLICY "Users can view accessible echeances_parcelles"
ON echeances_parcelles FOR SELECT TO authenticated
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
        AND am.role IN ('admin'::app_role, 'caissiere'::app_role)
        AND am.status = 'active'
      )
    )
  )
);

-- Fix echeances_parcelles UPDATE: add caissière access
DROP POLICY IF EXISTS "Users can update their own echeances" ON echeances_parcelles;
CREATE POLICY "Users can update accessible echeances_parcelles"
ON echeances_parcelles FOR UPDATE TO authenticated
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
        AND am.role IN ('admin'::app_role, 'caissiere'::app_role)
        AND am.status = 'active'
      )
    )
  )
);