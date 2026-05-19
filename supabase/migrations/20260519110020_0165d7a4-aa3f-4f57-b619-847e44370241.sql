CREATE POLICY "Gestionnaires can view accessible ilots"
ON public.ilots
FOR SELECT
USING (
  public.can_gestionnaire_access_lotissement(auth.uid(), user_id, lotissement_id)
);