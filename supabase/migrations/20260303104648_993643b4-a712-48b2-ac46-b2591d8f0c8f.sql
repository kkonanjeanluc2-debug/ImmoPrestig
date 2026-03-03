
-- Fix RLS on biens_achat: allow agency owners/admins to see biens created by their members
DROP POLICY IF EXISTS "Users can manage their own biens_achat" ON public.biens_achat;

CREATE POLICY "Users can manage their own biens_achat"
ON public.biens_achat
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  OR
  -- Current user is agency owner and creator is a member of their agency
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = biens_achat.user_id
  )
  OR
  -- Current user is admin member of the same agency as the creator
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am1.role = 'admin'::app_role
    AND am1.status = 'active'
    AND am2.user_id = biens_achat.user_id
  )
  OR
  -- Current user is a member of the agency owned by the creator
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = biens_achat.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
);
