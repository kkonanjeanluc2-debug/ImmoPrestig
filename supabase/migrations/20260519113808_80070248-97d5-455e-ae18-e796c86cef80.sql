-- Permettre au propriétaire de l'agence (admin) de voir tout ce que les membres
-- de son équipe créent dans le module Lotissement

CREATE POLICY "Agency owner can view team lotissements"
ON public.lotissements FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can view team parcelles"
ON public.parcelles FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can view team beneficiaires"
ON public.beneficiaires_lots FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can view team echeances parcelles"
ON public.echeances_parcelles FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can view team lotissement documents"
ON public.lotissement_documents FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));

CREATE POLICY "Agency owner can view team mutations parcelles"
ON public.mutations_parcelles FOR SELECT
USING (public.is_team_member_of_owned_agency(auth.uid(), user_id));