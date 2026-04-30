-- Ensure agency owners and active admin members have identical agency settings rights.
DROP POLICY IF EXISTS "Agency admins can update their agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can update their own agency" ON public.agencies;

CREATE POLICY "Agency owners and admins can update agency settings"
ON public.agencies
FOR UPDATE
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), id))
WITH CHECK (public.is_agency_owner_or_admin_for(auth.uid(), id));

-- Ensure team management rights are also identical for agency owners and active admin members.
DROP POLICY IF EXISTS "Agency admins can insert members" ON public.agency_members;
DROP POLICY IF EXISTS "Agency owners can insert members" ON public.agency_members;
DROP POLICY IF EXISTS "Agency admins can update members" ON public.agency_members;
DROP POLICY IF EXISTS "Agency owners can update members" ON public.agency_members;
DROP POLICY IF EXISTS "Agency admins can delete members" ON public.agency_members;
DROP POLICY IF EXISTS "Agency owners can delete members" ON public.agency_members;

CREATE POLICY "Agency owners and admins can insert members"
ON public.agency_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

CREATE POLICY "Agency owners and admins can update members"
ON public.agency_members
FOR UPDATE
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), agency_id))
WITH CHECK (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));

CREATE POLICY "Agency owners and admins can delete members"
ON public.agency_members
FOR DELETE
TO authenticated
USING (public.is_agency_owner_or_admin_for(auth.uid(), agency_id));