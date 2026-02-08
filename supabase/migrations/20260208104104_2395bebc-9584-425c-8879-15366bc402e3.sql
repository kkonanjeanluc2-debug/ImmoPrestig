-- Allow gestionnaires to view owners of properties they are assigned to
CREATE POLICY "Gestionnaires can view owners of assigned properties"
ON public.owners
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.properties p
    WHERE p.owner_id = owners.id
      AND p.assigned_to = auth.uid()
      AND p.deleted_at IS NULL
  )
);