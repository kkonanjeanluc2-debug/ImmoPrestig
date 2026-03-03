
-- Fix reservations_parcelles SELECT policy to handle reservations created by gestionnaires
DROP POLICY IF EXISTS "Users can view their own reservations parcelles" ON public.reservations_parcelles;
CREATE POLICY "Users can view their own reservations parcelles"
ON public.reservations_parcelles FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Admin of the agency that owns this reservation (creator is agency owner)
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
  OR
  -- Agency owner viewing reservation created by a member
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = reservations_parcelles.user_id
  )
  OR
  -- Admin member viewing reservation created by another member of same agency
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am1.role = 'admin'::app_role
    AND am1.status = 'active'
    AND am2.user_id = reservations_parcelles.user_id
  )
);

-- Fix UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update their own reservations parcelles" ON public.reservations_parcelles;
CREATE POLICY "Users can update their own reservations parcelles"
ON public.reservations_parcelles FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = reservations_parcelles.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am1.role = 'admin'::app_role
    AND am1.status = 'active'
    AND am2.user_id = reservations_parcelles.user_id
  )
);

-- Fix DELETE policy similarly
DROP POLICY IF EXISTS "Users can delete their own reservations parcelles" ON public.reservations_parcelles;
CREATE POLICY "Users can delete their own reservations parcelles"
ON public.reservations_parcelles FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = reservations_parcelles.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am1.role = 'admin'::app_role
    AND am1.status = 'active'
    AND am2.user_id = reservations_parcelles.user_id
  )
);
