-- Fix payments visibility: admin/owner should see payments from agency members
DROP POLICY IF EXISTS "Gestionnaires can view payments of assigned properties" ON public.payments;

CREATE POLICY "Agency members can view accessible payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = payments.tenant_id
      AND public.can_access_property(auth.uid(), p.user_id, p.assigned_to)
  )
);

-- Fix payments UPDATE for admin
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update accessible payments"
ON public.payments FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = payments.tenant_id
      AND public.can_access_property(auth.uid(), p.user_id, p.assigned_to)
  )
);