CREATE POLICY "Agency owner can update team ilots"
ON public.ilots
FOR UPDATE
TO authenticated
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id))
WITH CHECK (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team ilots"
ON public.ilots
FOR DELETE
TO authenticated
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));