
-- Create a SECURITY DEFINER function to check if a tenant belongs to an agency
-- This avoids RLS recursion between agencies and agency_members
CREATE OR REPLACE FUNCTION public.tenant_belongs_to_agency(_portal_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.portal_user_id = _portal_user_id
      AND t.has_portal_access = true
      AND (
        -- Tenant created by agency owner
        EXISTS (
          SELECT 1 FROM public.agencies a
          WHERE a.id = _agency_id AND a.user_id = t.user_id
        )
        OR
        -- Tenant created by a member of the agency
        EXISTS (
          SELECT 1 FROM public.agency_members am
          WHERE am.agency_id = _agency_id
            AND am.user_id = t.user_id
            AND am.status = 'active'
        )
      )
  )
$$;

-- Fix the tenant policy on agencies to use the SECURITY DEFINER function
DROP POLICY IF EXISTS "Tenants can view their agency" ON public.agencies;
CREATE POLICY "Tenants can view their agency"
ON public.agencies
FOR SELECT
TO authenticated
USING (
  public.tenant_belongs_to_agency(auth.uid(), id)
);
