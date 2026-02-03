-- Add portal_user_id column to store the tenant's login account separately
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS portal_user_id UUID;

-- Fix the kouao tenant - restore original ownership
-- First, find the agency owner that should own this tenant
-- We need to set user_id back to the agency owner

-- Update RLS policy to use the new column for tenant portal access
DROP POLICY IF EXISTS "Tenants can view their own payments" ON public.payments;
CREATE POLICY "Tenants can view their own payments" 
ON public.payments 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM tenants t 
  WHERE t.id = payments.tenant_id 
  AND t.portal_user_id = auth.uid()
  AND t.has_portal_access = true
));

DROP POLICY IF EXISTS "Tenants can view their own contracts" ON public.contracts;
CREATE POLICY "Tenants can view their own contracts" 
ON public.contracts 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM tenants t 
  WHERE t.id = contracts.tenant_id 
  AND t.portal_user_id = auth.uid()
  AND t.has_portal_access = true
));

DROP POLICY IF EXISTS "Tenants can view their own documents" ON public.documents;
CREATE POLICY "Tenants can view their own documents" 
ON public.documents 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM tenants t 
  WHERE t.id = documents.tenant_id 
  AND t.portal_user_id = auth.uid()
  AND t.has_portal_access = true
));

DROP POLICY IF EXISTS "Tenants can view their own etats_des_lieux" ON public.etats_des_lieux;
CREATE POLICY "Tenants can view their own etats_des_lieux" 
ON public.etats_des_lieux 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM tenants t 
  WHERE t.id = etats_des_lieux.tenant_id 
  AND t.portal_user_id = auth.uid()
  AND t.has_portal_access = true
));

-- Add policy for tenants to view their own tenant record
CREATE POLICY "Tenants can view their own record" 
ON public.tenants 
FOR SELECT 
USING (portal_user_id = auth.uid() AND has_portal_access = true);