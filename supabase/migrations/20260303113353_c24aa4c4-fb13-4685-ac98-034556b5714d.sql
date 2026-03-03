-- Fix INSERT policy on payments to allow admin/owner to create payments for agency tenants
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Fix UPDATE policy to include agency members access
DROP POLICY IF EXISTS "Users can update accessible payments" ON public.payments;
CREATE POLICY "Users can update accessible payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR can_access_payment_via_tenant(auth.uid(), tenant_id)
  OR is_super_admin(auth.uid())
);

-- Fix DELETE policy to include agency access
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
CREATE POLICY "Users can delete their own payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR can_access_payment_via_tenant(auth.uid(), tenant_id)
  OR is_super_admin(auth.uid())
);