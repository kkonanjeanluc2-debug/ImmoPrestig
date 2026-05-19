
-- DELETE policies for agency owner on lotissement module tables
CREATE POLICY "Agency owner can delete team lotissements"
ON public.lotissements FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team parcelles"
ON public.parcelles FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team beneficiaires_lots"
ON public.beneficiaires_lots FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team echeances_parcelles"
ON public.echeances_parcelles FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team lotissement_documents"
ON public.lotissement_documents FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can delete team mutations_parcelles"
ON public.mutations_parcelles FOR DELETE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

-- UPDATE policies (soft delete uses UPDATE on deleted_at)
CREATE POLICY "Agency owner can update team lotissements"
ON public.lotissements FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can update team parcelles"
ON public.parcelles FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can update team beneficiaires_lots"
ON public.beneficiaires_lots FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can update team echeances_parcelles"
ON public.echeances_parcelles FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can update team lotissement_documents"
ON public.lotissement_documents FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can update team mutations_parcelles"
ON public.mutations_parcelles FOR UPDATE
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));
