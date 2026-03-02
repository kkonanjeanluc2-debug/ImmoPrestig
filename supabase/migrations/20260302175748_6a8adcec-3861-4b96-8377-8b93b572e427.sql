-- Fix UPDATE policy to allow agency owners/admins to update properties created by their team members
DROP POLICY IF EXISTS "Agency owners and admins can update properties" ON public.properties;

CREATE POLICY "Agency owners and admins can update properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR
  -- Admin of agency that owns this property (property created by agency owner)
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = properties.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
  )
  OR
  -- Agency owner updating property created by a team member
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
      AND am.user_id = properties.user_id
  )
  OR
  -- Admin member updating property created by another member of the same agency
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
      AND am1.role = 'admin'::app_role
      AND am1.status = 'active'
      AND am2.user_id = properties.user_id
  )
  OR
  -- Gestionnaire assigned to this property can update it
  auth.uid() = assigned_to
);