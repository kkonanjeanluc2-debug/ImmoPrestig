-- Drop old policy and create new one with property_id check
DROP POLICY IF EXISTS "Users can view accessible tenants" ON public.tenants;

-- Create new function that takes property_id into account
CREATE OR REPLACE FUNCTION public.can_access_tenant_v2(_user_id uuid, _tenant_user_id uuid, _assigned_to uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- User is the tenant owner (agency owner)
    _user_id = _tenant_user_id
    OR 
    -- User is directly assigned to this tenant
    _user_id = _assigned_to
    OR 
    -- User is admin of the agency that owns this tenant
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _tenant_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR 
    -- User is a gestionnaire assigned to the property where this tenant lives
    (
      _property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.agencies a ON a.user_id = _tenant_user_id
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE p.id = _property_id
        AND p.assigned_to = _user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$function$;

-- Create new RLS policy using the updated function
CREATE POLICY "Users can view accessible tenants"
ON public.tenants
FOR SELECT
USING (can_access_tenant_v2(auth.uid(), user_id, assigned_to, property_id));