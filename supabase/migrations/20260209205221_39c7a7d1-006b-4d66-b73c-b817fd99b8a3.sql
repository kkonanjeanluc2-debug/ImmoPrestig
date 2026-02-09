-- Drop the broken UPDATE policy and recreate with correct agency hierarchy check
DROP POLICY IF EXISTS "Gestionnaires can update assigned prospects" ON public.parcelle_prospects;
DROP POLICY IF EXISTS "Users can update their own prospects" ON public.parcelle_prospects;

-- Single comprehensive UPDATE policy
CREATE POLICY "Users can update accessible prospects"
ON public.parcelle_prospects
FOR UPDATE
USING (
  -- Owner of the prospect
  auth.uid() = user_id
  OR
  -- Assigned to this prospect
  auth.uid() = assigned_to
  OR
  -- Agency owner (prospect created by a member of their agency)
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid()
    AND (
      parcelle_prospects.user_id = a.user_id
      OR EXISTS (
        SELECT 1 FROM agency_members am
        WHERE am.agency_id = a.id
        AND am.user_id = parcelle_prospects.user_id
        AND am.status = 'active'
      )
    )
  )
  OR
  -- Agency admin
  EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
    AND (
      a.user_id = parcelle_prospects.user_id
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id
        AND am2.user_id = parcelle_prospects.user_id
        AND am2.status = 'active'
      )
    )
  )
);