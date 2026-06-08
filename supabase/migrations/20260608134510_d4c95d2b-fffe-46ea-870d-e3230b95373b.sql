CREATE POLICY "Team members can read agency attestation templates"
ON public.attestation_templates
FOR SELECT
TO authenticated
USING (public.is_team_member_of_owned_agency(user_id, auth.uid()));