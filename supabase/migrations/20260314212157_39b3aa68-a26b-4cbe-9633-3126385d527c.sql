
-- Create a function to check gestionnaire access to echeances_achats via bien_achat assignment
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_echeance_achat(_user_id uuid, _echeance_user_id uuid, _achat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _user_id = _echeance_user_id
    OR
    EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _echeance_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _echeance_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM achats_immobiliers ai
      JOIN biens_achat ba ON ba.id = ai.bien_id
      JOIN agencies a ON a.user_id = ai.user_id
      JOIN agency_members am ON am.agency_id = a.id
      WHERE ai.id = _achat_id
      AND ba.assigned_to = _user_id
      AND am.user_id = _user_id
      AND am.status = 'active'
    )
$$;

DROP POLICY IF EXISTS "Users can manage their own echeances_achats" ON echeances_achats;

CREATE POLICY "Users can select echeances_achats"
ON echeances_achats FOR SELECT
TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));

CREATE POLICY "Users can insert echeances_achats"
ON echeances_achats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update echeances_achats"
ON echeances_achats FOR UPDATE
TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));

CREATE POLICY "Users can delete echeances_achats"
ON echeances_achats FOR DELETE
TO authenticated
USING (can_gestionnaire_access_echeance_achat(auth.uid(), user_id, achat_id));
