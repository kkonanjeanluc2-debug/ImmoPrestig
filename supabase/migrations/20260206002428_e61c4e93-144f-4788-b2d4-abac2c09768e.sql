-- Add RLS policy for tenants to view properties they are renting
CREATE POLICY "Tenants can view their rented properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
    AND (
      -- Property directly assigned to tenant
      t.property_id = properties.id
      OR
      -- Property linked via contract
      EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.tenant_id = t.id
        AND c.property_id = properties.id
      )
    )
  )
);