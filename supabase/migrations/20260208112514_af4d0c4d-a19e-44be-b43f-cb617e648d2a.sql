
-- Allow agency members to view their agency
CREATE POLICY "Agency members can view their agency"
ON public.agencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);
