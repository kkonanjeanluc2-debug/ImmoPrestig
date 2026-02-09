
-- Drop and recreate the acquereurs SELECT policy to also check ventes_parcelles
DROP POLICY IF EXISTS "Users can view accessible acquereurs" ON public.acquereurs;

CREATE POLICY "Users can view accessible acquereurs" ON public.acquereurs
FOR SELECT USING (
  -- Owner of the record
  (auth.uid() = user_id)
  -- Gestionnaire assigned to a bien_vente linked via ventes_immobilieres
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.acquereur_id = acquereurs.id AND bv.assigned_to = auth.uid()
  )
  -- Gestionnaire who sold a parcelle linked via ventes_parcelles
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    WHERE vp.acquereur_id = acquereurs.id AND vp.sold_by = auth.uid()
  )
  -- Gestionnaire assigned to a parcelle linked via ventes_parcelles
  OR EXISTS (
    SELECT 1 FROM ventes_parcelles vp
    JOIN parcelles p ON p.id = vp.parcelle_id
    WHERE vp.acquereur_id = acquereurs.id AND p.assigned_to = auth.uid()
  )
  -- Admin of the agency
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquereurs.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'
    AND am.status = 'active'
  )
  -- Agency owner
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
    AND acquereurs.user_id IN (
      SELECT am2.user_id FROM agency_members am2 WHERE am2.agency_id = a.id
      UNION SELECT a.user_id
    )
  )
);
