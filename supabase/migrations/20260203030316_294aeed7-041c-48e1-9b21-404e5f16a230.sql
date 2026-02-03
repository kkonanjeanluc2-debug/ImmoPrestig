-- Add RLS policy for tenants to update signature_status on their own contracts
CREATE POLICY "Tenants can update signature_status on their contracts" 
ON public.contracts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = contracts.tenant_id 
    AND t.portal_user_id = auth.uid() 
    AND t.has_portal_access = true
  )
);