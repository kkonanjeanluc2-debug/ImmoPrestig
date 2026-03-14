
-- ============================================
-- GESTIONNAIRE ISOLATION FOR VENTES IMMOBILIERES MODULE
-- ============================================

-- 1. Fix reservations_vente: remove duplicate SELECT policies, unify
DROP POLICY IF EXISTS "Users can view accessible reservations" ON reservations_vente;
DROP POLICY IF EXISTS "Users can view accessible reservations_vente" ON reservations_vente;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON reservations_vente;
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations_vente;

CREATE POLICY "reservations_vente_select" ON reservations_vente FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = reservations_vente.bien_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    JOIN agencies a ON a.user_id = bv.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = reservations_vente.bien_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = reservations_vente.user_id
  )
);

CREATE POLICY "reservations_vente_update" ON reservations_vente FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv WHERE bv.id = reservations_vente.bien_id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv JOIN agencies a ON a.user_id = bv.user_id JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = reservations_vente.bien_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = reservations_vente.user_id
  )
);

CREATE POLICY "reservations_vente_delete" ON reservations_vente FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv JOIN agencies a ON a.user_id = bv.user_id JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = reservations_vente.bien_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = reservations_vente.user_id
  )
);

-- 2. Fix ventes_immobilieres DELETE - restrict to owner/admin (not all members)
DROP POLICY IF EXISTS "Users can delete accessible ventes_immobilieres" ON ventes_immobilieres;

CREATE POLICY "ventes_immobilieres_delete" ON ventes_immobilieres FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ventes_immobilieres.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = ventes_immobilieres.user_id
  )
);

-- 3. Fix vente_prospects UPDATE/DELETE - allow gestionnaires assigned to the bien
DROP POLICY IF EXISTS "Users can update their own vente prospects" ON vente_prospects;
DROP POLICY IF EXISTS "Users can delete their own vente prospects" ON vente_prospects;

CREATE POLICY "vente_prospects_update" ON vente_prospects FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv WHERE bv.id = vente_prospects.bien_id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv JOIN agencies a ON a.user_id = bv.user_id JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = vente_prospects.bien_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = vente_prospects.user_id
  )
);

CREATE POLICY "vente_prospects_delete" ON vente_prospects FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv JOIN agencies a ON a.user_id = bv.user_id JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = vente_prospects.bien_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = vente_prospects.user_id
  )
);

-- 4. Fix vente_signatures SELECT - allow gestionnaires assigned to the bien
DROP POLICY IF EXISTS "Users can read own vente signatures" ON vente_signatures;

CREATE POLICY "vente_signatures_select" ON vente_signatures FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.id = vente_signatures.vente_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vente_signatures.user_id AND am.user_id = auth.uid() AND am.role = 'admin'::app_role AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = vente_signatures.user_id
  )
);

-- 5. Fix sale_contract_templates - allow team members to view templates
DROP POLICY IF EXISTS "Users can view their own sale contract templates" ON sale_contract_templates;

CREATE POLICY "sale_contract_templates_select" ON sale_contract_templates FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = sale_contract_templates.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = sale_contract_templates.user_id
  )
);
