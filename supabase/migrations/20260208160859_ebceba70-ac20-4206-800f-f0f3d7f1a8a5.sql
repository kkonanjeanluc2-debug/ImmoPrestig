-- Allow tenants to view their agency (the agency that manages their property)
CREATE POLICY "Tenants can view their agency"
ON public.agencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
    AND t.user_id = agencies.user_id
  )
);