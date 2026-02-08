-- Fix infinite recursion in RLS caused by policies joining properties<->contracts

-- 1) Helper function: check if a user (gestionnaire) can access a given property owned by an agency owner
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_property(
  _gestionnaire_id uuid,
  _property_id uuid,
  _agency_owner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.agencies a ON a.user_id = p.user_id
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE p.id = _property_id
      AND p.user_id = _agency_owner_id
      AND p.assigned_to = _gestionnaire_id
      AND am.user_id = _gestionnaire_id
      AND am.status = 'active'
  )
$function$;

-- 2) Replace contracts policy to avoid JOIN properties (which triggers properties RLS and recursion)
DROP POLICY IF EXISTS "Gestionnaires can view contracts of assigned properties" ON public.contracts;

CREATE POLICY "Gestionnaires can view contracts of assigned properties"
ON public.contracts
FOR SELECT
USING (
  public.can_gestionnaire_access_property(auth.uid(), contracts.property_id, contracts.user_id)
  OR EXISTS (
    -- Fallback if contract.property_id is null: resolve via tenant.property_id
    SELECT 1
    FROM public.tenants t
    WHERE t.id = contracts.tenant_id
      AND public.can_gestionnaire_access_property(auth.uid(), t.property_id, contracts.user_id)
  )
);

-- 3) Replace payments policy to avoid JOIN properties
DROP POLICY IF EXISTS "Gestionnaires can view payments of assigned properties" ON public.payments;

CREATE POLICY "Gestionnaires can view payments of assigned properties"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND public.can_gestionnaire_access_property(auth.uid(), t.property_id, payments.user_id)
  )
);
