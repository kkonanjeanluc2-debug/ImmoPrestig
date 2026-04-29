DROP POLICY IF EXISTS "Users can view their own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS contract_templates_select ON public.contract_templates;

CREATE POLICY contract_templates_select
ON public.contract_templates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = contract_templates.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
      AND am.user_id = contract_templates.user_id
      AND am.status = 'active'
  )
);