-- Add policy for gestionnaires to view contracts of tenants on their assigned properties
CREATE POLICY "Gestionnaires can view contracts of assigned properties"
ON public.contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    JOIN public.agencies a ON a.user_id = contracts.user_id
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE t.id = contracts.tenant_id
    AND p.assigned_to = auth.uid()
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
);

-- Add similar policy for payments table
CREATE POLICY "Gestionnaires can view payments of assigned properties"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    JOIN public.agencies a ON a.user_id = payments.user_id
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE t.id = payments.tenant_id
    AND p.assigned_to = auth.uid()
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
);