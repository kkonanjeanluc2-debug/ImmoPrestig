
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Agency members can view their agency" ON public.agencies;

-- Create a security definer function to check agency membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_agency_member(agency_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = agency_uuid
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Create a new policy using the security definer function
CREATE POLICY "Agency members can view their agency"
ON public.agencies
FOR SELECT
USING (
  user_id = auth.uid() OR is_agency_member(id)
);
