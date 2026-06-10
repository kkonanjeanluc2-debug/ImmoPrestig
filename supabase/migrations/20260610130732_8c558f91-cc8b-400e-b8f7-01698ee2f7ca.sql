DROP POLICY IF EXISTS "Gestionnaires can update agency parcelles for prefinancement" ON public.parcelles;

CREATE POLICY "Gestionnaires can update agency parcelles for prefinancement"
ON public.parcelles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelles.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'gestionnaire'::app_role
      AND am.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelles.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'gestionnaire'::app_role
      AND am.status = 'active'
  )
);