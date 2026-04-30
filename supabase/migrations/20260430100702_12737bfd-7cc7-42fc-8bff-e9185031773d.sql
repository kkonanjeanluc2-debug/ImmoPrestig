CREATE POLICY "Agency admins can update their agency"
ON public.agencies
FOR UPDATE
TO authenticated
USING (public.is_agency_admin(auth.uid(), id))
WITH CHECK (public.is_agency_admin(auth.uid(), id));