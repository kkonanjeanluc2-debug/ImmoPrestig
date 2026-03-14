
-- ============================================
-- GESTIONNAIRE ISOLATION FOR ACHATS MODULE
-- Gestionnaires only see biens_achat assigned to them
-- Admins/owners see everything
-- ============================================

-- 1. Function: can gestionnaire access bien_achat
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_achat(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
$$;

-- 2. Drop old permissive biens_achat policy
DROP POLICY IF EXISTS "Users can manage their own biens_achat" ON biens_achat;

-- 3. New biens_achat policies using assigned_to filtering
CREATE POLICY "biens_achat_select" ON biens_achat FOR SELECT TO authenticated
USING (can_gestionnaire_access_bien_achat(auth.uid(), user_id, assigned_to));

CREATE POLICY "biens_achat_insert" ON biens_achat FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "biens_achat_update" ON biens_achat FOR UPDATE TO authenticated
USING (can_gestionnaire_access_bien_achat(auth.uid(), user_id, assigned_to));

CREATE POLICY "biens_achat_delete" ON biens_achat FOR DELETE TO authenticated
USING (can_gestionnaire_access_bien_achat(auth.uid(), user_id, assigned_to));

-- 4. Drop old vendeurs policy
DROP POLICY IF EXISTS "Users can manage their own vendeurs" ON vendeurs;

-- Vendeurs: gestionnaires see only vendeurs linked to their assigned biens
CREATE POLICY "vendeurs_select" ON vendeurs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.vendeur_id = vendeurs.id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = vendeurs.user_id
  )
);

CREATE POLICY "vendeurs_insert" ON vendeurs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendeurs_update" ON vendeurs FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = vendeurs.user_id
  )
);

CREATE POLICY "vendeurs_delete" ON vendeurs FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = vendeurs.user_id
  )
);

-- 5. Drop old offres_achat policy
DROP POLICY IF EXISTS "Authenticated users can manage own offres_achat" ON offres_achat;

-- Offres: gestionnaires see only offres on their assigned biens
CREATE POLICY "offres_achat_select" ON offres_achat FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = offres_achat.bien_id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = offres_achat.user_id
  )
);

CREATE POLICY "offres_achat_insert" ON offres_achat FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "offres_achat_update" ON offres_achat FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba WHERE ba.id = offres_achat.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = offres_achat.user_id
  )
);

CREATE POLICY "offres_achat_delete" ON offres_achat FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = offres_achat.user_id
  )
);

-- 6. Drop old achats_immobiliers policy
DROP POLICY IF EXISTS "Users can manage their own achats_immobiliers" ON achats_immobiliers;

-- Achats: gestionnaires see only achats on their assigned biens
CREATE POLICY "achats_immobiliers_select" ON achats_immobiliers FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = achats_immobiliers.bien_id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = achats_immobiliers.user_id
  )
);

CREATE POLICY "achats_immobiliers_insert" ON achats_immobiliers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "achats_immobiliers_update" ON achats_immobiliers FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba WHERE ba.id = achats_immobiliers.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = achats_immobiliers.user_id
  )
);

CREATE POLICY "achats_immobiliers_delete" ON achats_immobiliers FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = achats_immobiliers.user_id
  )
);

-- 7. Update echeances_achats - drop old policies, use bien assignment
DROP POLICY IF EXISTS "Users can select echeances_achats" ON echeances_achats;
DROP POLICY IF EXISTS "Users can insert echeances_achats" ON echeances_achats;
DROP POLICY IF EXISTS "Users can update echeances_achats" ON echeances_achats;
DROP POLICY IF EXISTS "Users can delete echeances_achats" ON echeances_achats;

-- Recreate with bien-based assignment check
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_echeance_achat(_user_id uuid, _echeance_user_id uuid, _achat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
$$;

CREATE POLICY "echeances_achats_select" ON echeances_achats FOR SELECT TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));

CREATE POLICY "echeances_achats_insert" ON echeances_achats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "echeances_achats_update" ON echeances_achats FOR UPDATE TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));

CREATE POLICY "echeances_achats_delete" ON echeances_achats FOR DELETE TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));

-- 8. Update mutations_achats
DROP POLICY IF EXISTS "Users can view their own mutations" ON mutations_achats;
DROP POLICY IF EXISTS "Users can insert their own mutations" ON mutations_achats;
DROP POLICY IF EXISTS "Users can update their own mutations" ON mutations_achats;
DROP POLICY IF EXISTS "Users can delete their own mutations" ON mutations_achats;

CREATE POLICY "mutations_achats_select" ON mutations_achats FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM achats_immobiliers ai
    JOIN biens_achat ba ON ba.id = ai.bien_id
    WHERE ai.id = mutations_achats.achat_id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = mutations_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = mutations_achats.user_id
  )
);

CREATE POLICY "mutations_achats_insert" ON mutations_achats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mutations_achats_update" ON mutations_achats FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = mutations_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = mutations_achats.user_id
  )
);

CREATE POLICY "mutations_achats_delete" ON mutations_achats FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = mutations_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = mutations_achats.user_id
  )
);

-- 9. Update documents_achats
DROP POLICY IF EXISTS "Users can view accessible documents_achats" ON documents_achats;
DROP POLICY IF EXISTS "Users can create their own documents_achats" ON documents_achats;
DROP POLICY IF EXISTS "Users can update accessible documents_achats" ON documents_achats;
DROP POLICY IF EXISTS "Users can delete accessible documents_achats" ON documents_achats;

CREATE POLICY "documents_achats_select" ON documents_achats FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = documents_achats.bien_id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = documents_achats.user_id
  )
);

CREATE POLICY "documents_achats_insert" ON documents_achats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_achats_update" ON documents_achats FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = documents_achats.user_id
  )
);

CREATE POLICY "documents_achats_delete" ON documents_achats FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = documents_achats.user_id
  )
);

-- 10. Update acquereurs: also allow gestionnaires who have achats on their assigned biens
DROP POLICY IF EXISTS "Users can view accessible acquereurs" ON acquereurs;

CREATE POLICY "acquereurs_select" ON acquereurs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM achats_immobiliers ai
    JOIN biens_achat ba ON ba.id = ai.bien_id
    WHERE ai.acquereur_id = acquereurs.id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM offres_achat oa
    JOIN biens_achat ba ON ba.id = oa.bien_id
    WHERE oa.acquereur_id = acquereurs.id
    AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.acquereur_id = acquereurs.id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    WHERE vp.acquereur_id = acquereurs.id
    AND (vp.sold_by = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    JOIN parcelles p ON p.id = vp.parcelle_id
    WHERE vp.acquereur_id = acquereurs.id
    AND p.assigned_to = auth.uid()
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
);

-- Keep anon policies for offres_achat
-- They already exist and were not dropped
