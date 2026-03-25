
-- 1. Fix can_gestionnaire_access_bien_achat: add caissière
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_achat(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _bien_user_id
    OR _user_id = _assigned_to
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _bien_user_id
    )
    OR EXISTS (
      SELECT 1 FROM agency_members am1
      JOIN agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
      AND am1.role = 'admin'::app_role
      AND am1.status = 'active'
      AND am2.user_id = _bien_user_id
    )
    -- Caissière access
    OR EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
      AND am.user_id = _user_id
      AND am.role = 'caissiere'::app_role
      AND am.status = 'active'
    )
$$;

-- 2. Fix achats_immobiliers SELECT: add caissière
DROP POLICY IF EXISTS "achats_immobiliers_select" ON achats_immobiliers;
CREATE POLICY "achats_immobiliers_select" ON achats_immobiliers FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = achats_immobiliers.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = achats_immobiliers.user_id
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- 3. Fix achats_immobiliers UPDATE: add caissière
DROP POLICY IF EXISTS "achats_immobiliers_update" ON achats_immobiliers;
CREATE POLICY "achats_immobiliers_update" ON achats_immobiliers FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = achats_immobiliers.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = achats_immobiliers.user_id
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- 4. Fix acquereurs SELECT: add caissière
DROP POLICY IF EXISTS "acquereurs_select" ON acquereurs;
CREATE POLICY "acquereurs_select" ON acquereurs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM achats_immobiliers ai
    JOIN biens_achat ba ON ba.id = ai.bien_id
    WHERE ai.acquereur_id = acquereurs.id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM offres_achat oa
    JOIN biens_achat ba ON ba.id = oa.bien_id
    WHERE oa.acquereur_id = acquereurs.id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.acquereur_id = acquereurs.id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    WHERE vp.acquereur_id = acquereurs.id AND vp.sold_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    JOIN parcelles p ON p.id = vp.parcelle_id
    WHERE vp.acquereur_id = acquereurs.id AND p.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquereurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
    AND acquereurs.user_id IN (
      SELECT am2.user_id FROM agency_members am2 WHERE am2.agency_id = a.id
      UNION SELECT a.user_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquereurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- 5. Fix acquereurs UPDATE: add caissière
DROP POLICY IF EXISTS "Users can update their own acquereurs" ON acquereurs;
CREATE POLICY "Users can update their own acquereurs" ON acquereurs FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquereurs.user_id
    AND am.user_id = auth.uid()
    AND am.role IN ('admin'::app_role, 'caissiere'::app_role)
    AND am.status = 'active'
  )
);
