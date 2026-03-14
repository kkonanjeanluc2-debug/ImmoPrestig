
-- Fix can_access_property: gestionnaire creators should NOT see properties assigned to someone else
CREATE OR REPLACE FUNCTION public.can_access_property(_user_id uuid, _property_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- User is assigned to this property
    _user_id = _assigned_to

    OR
    -- Creator can see ONLY if property is not assigned to someone else,
    -- OR if creator is admin/super_admin
    (
      _user_id = _property_user_id
      AND (
        _assigned_to IS NULL
        OR _assigned_to = _user_id
        OR public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
        -- Or user is agency owner
        OR EXISTS (
          SELECT 1 FROM public.agencies a WHERE a.user_id = _user_id
        )
      )
    )

    OR
    -- User is admin of the agency that owns this property
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )

    OR
    -- User is agency owner and property was created by a member of this agency
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _property_user_id
    )

    OR
    -- User is active admin member and property creator belongs to same agency
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
    -- Active agency members can still see unassigned properties created by agency owner
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
$$;
