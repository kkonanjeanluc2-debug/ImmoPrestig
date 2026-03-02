
-- Fix can_access_tenant_v2 to handle tenants created by any agency member
CREATE OR REPLACE FUNCTION public.can_access_tenant_v2(_user_id uuid, _tenant_user_id uuid, _assigned_to uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    -- User is the tenant creator
    _user_id = _tenant_user_id
    OR 
    -- User is directly assigned to this tenant
    _user_id = _assigned_to
    OR 
    -- User is admin/owner of the agency and tenant was created by agency owner
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _tenant_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    -- User is agency owner and tenant was created by a member of their agency
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _tenant_user_id
    )
    OR
    -- User is admin member and tenant was created by someone in the same agency
    EXISTS (
      SELECT 1 FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
      AND am1.role = 'admin'::app_role
      AND am1.status = 'active'
      AND am2.user_id = _tenant_user_id
    )
    OR 
    -- User is a gestionnaire assigned to the property where this tenant lives
    (
      _property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.agencies a ON a.user_id IN (
          SELECT a2.user_id FROM public.agencies a2
          JOIN public.agency_members am ON am.agency_id = a2.id
          WHERE am.user_id = _tenant_user_id AND am.status = 'active'
          UNION
          SELECT _tenant_user_id
        )
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE p.id = _property_id
        AND p.assigned_to = _user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$function$;

-- Also fix INSERT policy to allow gestionnaires to create tenants
DROP POLICY IF EXISTS "Agency owners can insert tenants" ON public.tenants;
CREATE POLICY "Agency members can insert tenants"
ON public.tenants FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Fix UPDATE policy to also cover tenants created by other agency members
DROP POLICY IF EXISTS "Agency owners and admins can update tenants" ON public.tenants;
CREATE POLICY "Agency owners and admins can update tenants"
ON public.tenants FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = tenants.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = tenants.user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am1.role = 'admin'::app_role
    AND am1.status = 'active'
    AND am2.user_id = tenants.user_id
  )
);
