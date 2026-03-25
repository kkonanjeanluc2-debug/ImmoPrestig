CREATE OR REPLACE FUNCTION public.can_access_owner(_user_id uuid, _owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _owner_user_id
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_user_id
      AND am.user_id = _user_id
      AND am.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _owner_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
      AND am1.status = 'active'
      AND am2.user_id = _owner_user_id
    )
$$;