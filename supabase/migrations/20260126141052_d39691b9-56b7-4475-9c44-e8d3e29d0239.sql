-- Create a security definer function to check if user is an admin member of an agency
CREATE OR REPLACE FUNCTION public.is_agency_admin(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE user_id = _user_id
      AND agency_id = _agency_id
      AND role = 'admin'::app_role
      AND status = 'active'
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Agency admins can view members" ON public.agency_members;

-- Recreate it using the security definer function
CREATE POLICY "Agency admins can view members" 
ON public.agency_members 
FOR SELECT 
USING (
  public.is_agency_admin(auth.uid(), agency_id)
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.agencies WHERE id = agency_members.agency_id AND user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);