CREATE OR REPLACE FUNCTION public.can_access_property(_user_id uuid, _property_user_id uuid, _assigned_to uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _assigned_to
    OR
    (
      _user_id = _property_user_id
      AND (
        _assigned_to IS NULL
        OR _assigned_to = _user_id
        OR public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
        OR EXISTS (
          SELECT 1 FROM public.agencies a WHERE a.user_id = _user_id
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _property_user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
        AND am1.role = 'admin'::app_role
        AND am1.status = 'active'
        AND am2.user_id = _property_user_id
    )
    OR
    (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _property_user_id
          AND am.user_id = _user_id
          AND am.status = 'active'
      )
    )
    OR
    -- Caissière can see ALL properties in their agency
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    OR
    -- Caissière seeing properties created by other team members
    EXISTS (
      SELECT 1 FROM public.agency_members am_caissiere
      JOIN public.agency_members am_creator ON am_caissiere.agency_id = am_creator.agency_id
      WHERE am_caissiere.user_id = _user_id
        AND am_caissiere.role = 'caissiere'::app_role
        AND am_caissiere.status = 'active'
        AND am_creator.user_id = _property_user_id
    )
    OR
    -- Comptable can see ALL properties in their agency (full financial visibility)
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'comptable'::app_role
        AND am.status = 'active'
    )
    OR
    -- Comptable seeing properties created by other team members
    EXISTS (
      SELECT 1 FROM public.agency_members am_comptable
      JOIN public.agency_members am_creator ON am_comptable.agency_id = am_creator.agency_id
      WHERE am_comptable.user_id = _user_id
        AND am_comptable.role = 'comptable'::app_role
        AND am_comptable.status = 'active'
        AND am_creator.user_id = _property_user_id
    )
$function$;