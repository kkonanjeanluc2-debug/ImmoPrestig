CREATE POLICY "Team members can view agency beneficiaires"
ON public.beneficiaires_lots
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = beneficiaires_lots.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);