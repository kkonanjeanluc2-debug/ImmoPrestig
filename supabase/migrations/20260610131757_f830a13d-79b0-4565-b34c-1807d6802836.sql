CREATE OR REPLACE FUNCTION public.is_active_agency_member_for(_owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = _owner_user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Active agency members can update agency parcelles" ON public.parcelles;
CREATE POLICY "Active agency members can update agency parcelles"
ON public.parcelles
FOR UPDATE
TO authenticated
USING (public.is_active_agency_member_for(user_id))
WITH CHECK (public.is_active_agency_member_for(user_id));