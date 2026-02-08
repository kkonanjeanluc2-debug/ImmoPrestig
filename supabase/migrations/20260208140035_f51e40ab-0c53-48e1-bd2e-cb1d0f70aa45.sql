-- Fix UPDATE policy to allow admins to update/delete biens created by gestionnaires
DROP POLICY IF EXISTS "Agency owners and admins can update biens_vente" ON public.biens_vente;

CREATE POLICY "Agency owners and admins can update biens_vente" 
ON public.biens_vente FOR UPDATE 
USING (
  -- Creator can update
  auth.uid() = user_id
  OR 
  -- Assigned user can update
  auth.uid() = assigned_to
  OR 
  -- Agency owner can update any bien in their agency
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
    AND (
      biens_vente.user_id = a.user_id
      OR EXISTS (
        SELECT 1 FROM agency_members am
        WHERE am.agency_id = a.id
        AND am.user_id = biens_vente.user_id
        AND am.status = 'active'
      )
    )
  )
  OR
  -- Admin member can update any bien in their agency
  EXISTS (
    SELECT 1 FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
    AND (
      biens_vente.user_id = a.user_id
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id
        AND am2.user_id = biens_vente.user_id
        AND am2.status = 'active'
      )
    )
  )
);