CREATE POLICY "Commercials can view parcelles for their own sales"
ON public.parcelles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ventes_parcelles vp
    JOIN public.agencies a ON a.user_id = parcelles.user_id
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE vp.parcelle_id = parcelles.id
      AND vp.sold_by = auth.uid()
      AND am.user_id = auth.uid()
      AND am.role = 'gestionnaire'::app_role
      AND am.status = 'active'
  )
);