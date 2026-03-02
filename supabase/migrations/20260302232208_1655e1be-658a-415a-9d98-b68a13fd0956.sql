-- Allow agency members (gestionnaires) to insert contracts for properties they have access to
DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
CREATE POLICY "Users can insert their own contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admin/owner to update contracts created by agency members
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
CREATE POLICY "Users can update accessible contracts"
ON public.contracts FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = contracts.property_id
      AND public.can_access_property(auth.uid(), p.user_id, p.assigned_to)
  )
);

-- Allow admin/owner to delete contracts created by agency members
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
CREATE POLICY "Users can delete accessible contracts"
ON public.contracts FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_agency_owner_or_admin(auth.uid())
);