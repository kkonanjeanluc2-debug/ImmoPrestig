-- Fix contracts visibility for agency owner/admin when contracts are created by managers
DROP POLICY IF EXISTS "Gestionnaires can view contracts of assigned properties" ON public.contracts;

CREATE POLICY "Agency members can view accessible contracts"
ON public.contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = contracts.property_id
      AND public.can_access_property(auth.uid(), p.user_id, p.assigned_to)
  )
);