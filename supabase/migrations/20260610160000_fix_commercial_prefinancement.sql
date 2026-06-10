-- Corrige la politique RLS pour permettre aux commerciaux d'enregistrer un préfinancement.
-- La politique existante "Agency owner can update team parcelles" avait les paramètres inversés.
-- Cette nouvelle politique utilise is_team_member_of_owned_agency dans le bon ordre.

DROP POLICY IF EXISTS "commercials_can_update_parcelles" ON public.parcelles;
DROP POLICY IF EXISTS "commercial_prefinancement_fix" ON public.parcelles;

CREATE POLICY "commercials_can_update_parcelles"
ON public.parcelles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_team_member_of_owned_agency(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_team_member_of_owned_agency(user_id, auth.uid())
);
