
-- Drop restrictive policies that only check user_id
DROP POLICY IF EXISTS "Users can view their own owners" ON public.owners;
DROP POLICY IF EXISTS "Users can update their own owners" ON public.owners;
DROP POLICY IF EXISTS "Users can delete their own owners" ON public.owners;
DROP POLICY IF EXISTS "Gestionnaires can view owners of assigned properties" ON public.owners;

-- Create a SECURITY DEFINER function to check access to owners
CREATE OR REPLACE FUNCTION public.can_access_owner(_user_id uuid, _owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- User is the creator
    _user_id = _owner_user_id
    OR
    -- User is admin/owner of the agency and owner was created by agency owner
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    -- User is agency owner and owner was created by a member of their agency
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _owner_user_id
    )
    OR
    -- User is admin member and owner creator belongs to same agency
    EXISTS (
      SELECT 1 FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
      AND am1.role = 'admin'::app_role
      AND am1.status = 'active'
      AND am2.user_id = _owner_user_id
    )
$$;

-- SELECT: admins see all agency owners, gestionnaires see owners of assigned properties
CREATE POLICY "Users can view accessible owners" ON public.owners
  FOR SELECT TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));

CREATE POLICY "Gestionnaires can view owners of assigned properties" ON public.owners
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.owner_id = owners.id
      AND p.assigned_to = auth.uid()
      AND p.deleted_at IS NULL
    )
  );

-- UPDATE: same logic
CREATE POLICY "Users can update accessible owners" ON public.owners
  FOR UPDATE TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));

-- DELETE: same logic
CREATE POLICY "Users can delete accessible owners" ON public.owners
  FOR DELETE TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));
