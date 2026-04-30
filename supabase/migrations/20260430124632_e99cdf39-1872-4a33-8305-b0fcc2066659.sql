
-- Allow agency admins to insert members in their agency (same as owners)
DROP POLICY IF EXISTS "Agency admins can insert members" ON public.agency_members;
CREATE POLICY "Agency admins can insert members"
ON public.agency_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_agency_admin(auth.uid(), agency_id));

-- Allow agency admins to update members in their agency (same as owners)
DROP POLICY IF EXISTS "Agency admins can update members" ON public.agency_members;
CREATE POLICY "Agency admins can update members"
ON public.agency_members
FOR UPDATE
TO authenticated
USING (public.is_agency_admin(auth.uid(), agency_id))
WITH CHECK (public.is_agency_admin(auth.uid(), agency_id));

-- Allow agency admins to delete members in their agency (same as owners)
DROP POLICY IF EXISTS "Agency admins can delete members" ON public.agency_members;
CREATE POLICY "Agency admins can delete members"
ON public.agency_members
FOR DELETE
TO authenticated
USING (public.is_agency_admin(auth.uid(), agency_id));
