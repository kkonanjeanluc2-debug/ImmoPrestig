-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view accessible parcelle_prospects" ON public.parcelle_prospects;

-- Create new policy that allows:
-- 1. Owner (user_id) to see their own prospects
-- 2. Assigned user to see their prospects
-- 3. Agency owner to see all prospects from their agency
-- 4. Agency admins to see all prospects from their agency
CREATE POLICY "Users can view accessible parcelle_prospects" 
ON public.parcelle_prospects 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM agency_members am 
      WHERE am.agency_id = a.id 
      AND am.user_id = parcelle_prospects.user_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = parcelle_prospects.user_id 
    AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelle_prospects.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'
    AND am.status = 'active'
  )
);