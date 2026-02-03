-- Add RLS policy for tenants to view contract signatures for their contracts
CREATE POLICY "Tenants can view signatures for their contracts"
ON public.contract_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM contracts c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = contract_signatures.contract_id
    AND t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
  )
);

-- Add RLS policy for tenants to insert their own signature
CREATE POLICY "Tenants can sign their contracts"
ON public.contract_signatures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM contracts c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = contract_id
    AND t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
    AND signer_type = 'tenant'
  )
);

-- Add RLS policy for tenants to update signature via portal (complete pending signature)
CREATE POLICY "Tenants can complete their signature via portal"
ON public.contract_signatures
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM contracts c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.id = contract_signatures.contract_id
    AND t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
    AND signer_type = 'tenant'
  )
);