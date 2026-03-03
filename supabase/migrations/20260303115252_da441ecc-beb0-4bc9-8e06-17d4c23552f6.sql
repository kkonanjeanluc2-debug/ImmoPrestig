-- Helpers SECURITY DEFINER to avoid cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.is_agency_owner(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    WHERE a.id = _agency_id
      AND a.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_member_of_owned_agency(_owner_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = _owner_user_id
      AND am.user_id = _target_user_id
      AND am.status = 'active'
  )
$$;

-- Redefine tenant-agency check without self-recursive query patterns in policies
CREATE OR REPLACE FUNCTION public.tenant_belongs_to_agency(_portal_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.portal_user_id = _portal_user_id
      AND t.has_portal_access = true
      AND (
        public.is_agency_owner(t.user_id, _agency_id)
        OR EXISTS (
          SELECT 1
          FROM public.agency_members am
          WHERE am.agency_id = _agency_id
            AND am.user_id = t.user_id
            AND am.status = 'active'
        )
      )
  )
$$;

-- agency_members: replace policies that directly queried agencies (source of recursion loop)
DROP POLICY IF EXISTS "Agency owners can view their members" ON public.agency_members;
CREATE POLICY "Agency owners can view their members"
ON public.agency_members
FOR SELECT
TO public
USING (public.is_agency_owner(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency owners can update members" ON public.agency_members;
CREATE POLICY "Agency owners can update members"
ON public.agency_members
FOR UPDATE
TO public
USING (public.is_agency_owner(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency owners can delete members" ON public.agency_members;
CREATE POLICY "Agency owners can delete members"
ON public.agency_members
FOR DELETE
TO public
USING (public.is_agency_owner(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency owners can insert members" ON public.agency_members;
CREATE POLICY "Agency owners can insert members"
ON public.agency_members
FOR INSERT
TO public
WITH CHECK (public.is_agency_owner(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency admins can view members" ON public.agency_members;
CREATE POLICY "Agency admins can view members"
ON public.agency_members
FOR SELECT
TO public
USING (
  auth.uid() = user_id
  OR public.is_agency_owner(auth.uid(), agency_id)
  OR public.is_agency_admin(auth.uid(), agency_id)
  OR public.is_super_admin(auth.uid())
);

-- profiles: replace owner/team policies to avoid direct agencies+agency_members joins in policy body
DROP POLICY IF EXISTS "Agency owners can view team member profiles" ON public.profiles;
CREATE POLICY "Agency owners can view team member profiles"
ON public.profiles
FOR SELECT
TO public
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

DROP POLICY IF EXISTS "Agency owners can update team member profiles" ON public.profiles;
CREATE POLICY "Agency owners can update team member profiles"
ON public.profiles
FOR UPDATE
TO public
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));