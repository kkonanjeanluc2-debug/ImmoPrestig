-- Add RLS policy to allow agency owners to view profiles of their team members
CREATE POLICY "Agency owners can view team member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = profiles.user_id
  )
);