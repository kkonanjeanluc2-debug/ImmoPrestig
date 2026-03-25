-- =============================================
-- 1. VENDEURS: Add caissiere access (SELECT + UPDATE)
-- =============================================

-- SELECT
DROP POLICY IF EXISTS "vendeurs_select" ON public.vendeurs;
CREATE POLICY "vendeurs_select" ON public.vendeurs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.vendeur_id = vendeurs.id AND ba.assigned_to = auth.uid()
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
  -- Caissière access
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- UPDATE
DROP POLICY IF EXISTS "vendeurs_update" ON public.vendeurs;
CREATE POLICY "vendeurs_update" ON public.vendeurs FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
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
  -- Caissière access
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- =============================================
-- 2. OFFRES_ACHAT: Add caissiere access (SELECT + UPDATE + INSERT)
-- =============================================

-- SELECT
DROP POLICY IF EXISTS "offres_achat_select" ON public.offres_achat;
CREATE POLICY "offres_achat_select" ON public.offres_achat FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = offres_achat.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = offres_achat.user_id
  )
  -- Caissière access
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- UPDATE
DROP POLICY IF EXISTS "offres_achat_update" ON public.offres_achat;
CREATE POLICY "offres_achat_update" ON public.offres_achat FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_achat ba
    WHERE ba.id = offres_achat.bien_id AND ba.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = offres_achat.user_id
  )
  -- Caissière access
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);

-- =============================================
-- 3. ACHATS_IMMOBILIERS: Add caissiere to INSERT policy
-- =============================================

DROP POLICY IF EXISTS "achats_immobiliers_insert" ON public.achats_immobiliers;
CREATE POLICY "achats_immobiliers_insert" ON public.achats_immobiliers FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  -- Caissière can insert achats for agency owner
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'caissiere'::app_role
    AND am.status = 'active'
  )
);
