
-- Update SELECT policy: gestionnaires see only their own, admins see all agency expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;

CREATE POLICY "Users can view expenses based on role" ON public.expenses
FOR SELECT USING (
  -- Owner always sees own
  user_id = auth.uid()
  OR
  -- Agency owner sees all members' expenses
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.user_id = auth.uid()
    AND (
      expenses.user_id = a.user_id
      OR EXISTS (
        SELECT 1 FROM public.agency_members am
        WHERE am.agency_id = a.id
        AND am.user_id = expenses.user_id
        AND am.status = 'active'
      )
    )
  )
  OR
  -- Admin members see all agency expenses
  EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
    AND (
      expenses.user_id = a.user_id
      OR EXISTS (
        SELECT 1 FROM public.agency_members am2
        WHERE am2.agency_id = a.id
        AND am2.user_id = expenses.user_id
      )
    )
  )
  -- Gestionnaires only see their own (handled by user_id = auth.uid() above)
);
