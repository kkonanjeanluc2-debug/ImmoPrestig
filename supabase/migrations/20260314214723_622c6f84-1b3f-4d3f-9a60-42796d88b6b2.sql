
-- Fix biens_vente SELECT: the LEFT JOIN allows any active member to see all biens
DROP POLICY IF EXISTS "Users can view accessible biens_vente" ON biens_vente;

CREATE POLICY "biens_vente_select" ON biens_vente FOR SELECT TO authenticated
USING (
  can_gestionnaire_access_bien_vente(auth.uid(), user_id, assigned_to)
);
