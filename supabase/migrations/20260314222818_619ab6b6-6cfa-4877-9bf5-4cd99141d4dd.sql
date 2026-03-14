
-- Replace the profiles SELECT policy to also allow admin members to view team profiles
DROP POLICY IF EXISTS "Agency owners can view team member profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.can_view_team_profile(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Agency owner can see their team members
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _viewer_id
        AND am.user_id = _target_user_id
        AND am.status = 'active'
    )
    -- Admin member can see other members in same agency
    OR EXISTS (
      SELECT 1 FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _viewer_id
        AND am1.role = 'admin'::app_role
        AND am1.status = 'active'
        AND am2.user_id = _target_user_id
        AND am2.status = 'active'
    )
    -- Admin member can see agency owner's profile
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      JOIN public.agencies a ON a.id = am.agency_id
      WHERE am.user_id = _viewer_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
        AND a.user_id = _target_user_id
    )
$$;

CREATE POLICY "Team members can view team profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_team_profile(auth.uid(), user_id));
