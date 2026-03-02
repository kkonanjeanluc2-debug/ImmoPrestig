
-- Create a SECURITY DEFINER function to check contract access via property
-- This avoids RLS recursion by bypassing properties RLS
CREATE OR REPLACE FUNCTION public.can_access_contract_via_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = _property_id
      AND public.can_access_property(_user_id, p.user_id, p.assigned_to)
  )
$$;

-- Fix contracts SELECT: use the new function to avoid recursion
DROP POLICY IF EXISTS "Agency members can view accessible contracts" ON public.contracts;
CREATE POLICY "Agency members can view accessible contracts"
ON public.contracts FOR SELECT
USING (
  public.can_access_contract_via_property(auth.uid(), property_id)
);

-- Fix contracts UPDATE: use the new function
DROP POLICY IF EXISTS "Users can update accessible contracts" ON public.contracts;
CREATE POLICY "Users can update accessible contracts"
ON public.contracts FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.can_access_contract_via_property(auth.uid(), property_id)
);

-- Fix payments SELECT: use a SECURITY DEFINER function too
CREATE OR REPLACE FUNCTION public.can_access_payment_via_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = _tenant_id
      AND public.can_access_property(_user_id, p.user_id, p.assigned_to)
  )
$$;

DROP POLICY IF EXISTS "Agency members can view accessible payments" ON public.payments;
CREATE POLICY "Agency members can view accessible payments"
ON public.payments FOR SELECT
USING (
  public.can_access_payment_via_tenant(auth.uid(), tenant_id)
);

-- Fix payments UPDATE
DROP POLICY IF EXISTS "Users can update accessible payments" ON public.payments;
CREATE POLICY "Users can update accessible payments"
ON public.payments FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.can_access_payment_via_tenant(auth.uid(), tenant_id)
);
