-- Add RLS policy to allow agency owners to update team member profiles
CREATE POLICY "Agency owners can update team member profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = profiles.user_id
  )
);