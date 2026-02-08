-- Make bien_id nullable to allow creating prospects without a bien
ALTER TABLE public.vente_prospects 
ALTER COLUMN bien_id DROP NOT NULL;

-- Update the RLS policy to also allow viewing prospects without a bien
DROP POLICY IF EXISTS "Users can view accessible vente prospects" ON public.vente_prospects;

CREATE POLICY "Users can view accessible vente prospects"
ON public.vente_prospects FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = vente_prospects.bien_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    JOIN agencies a ON a.user_id = bv.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = vente_prospects.bien_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  -- Allow viewing prospects without a bien if user is admin of the prospect owner's agency
  OR (
    vente_prospects.bien_id IS NULL
    AND EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = vente_prospects.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
  )
);