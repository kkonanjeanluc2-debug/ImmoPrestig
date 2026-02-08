-- Update the can_access_tenant function to check property assignment for gestionnaires
CREATE OR REPLACE FUNCTION public.can_access_tenant(_user_id uuid, _tenant_user_id uuid, _assigned_to uuid)
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
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.properties p ON p.id = t.property_id
      JOIN public.agencies a ON a.user_id = t.user_id
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE t.user_id = _tenant_user_id
      AND p.assigned_to = _user_id
      AND am.user_id = _user_id
      AND am.status = 'active'
    )
    OR
    -- Gestionnaire with no specific assignment can see unassigned tenants on unassigned properties
    (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _tenant_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$function$;