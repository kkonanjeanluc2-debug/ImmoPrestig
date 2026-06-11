-- Correctif : récursion infinie entre politiques RLS (erreurs 500 dans l'app).
-- La politique "Members can view their agency" (migration 20260611150000)
-- interrogeait agency_members directement ; or les politiques d'agency_members
-- interrogent agencies => boucle infinie dès qu'un utilisateur connecté touche
-- une table dont la politique passe par agencies.
-- On utilise get_user_agency_id() qui est SECURITY DEFINER (ignore la RLS).

DROP POLICY IF EXISTS "Members can view their agency" ON public.agencies;
CREATE POLICY "Members can view their agency"
ON public.agencies FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR id = public.get_user_agency_id(auth.uid())
);

-- Vérification : simule un utilisateur connecté et interroge les tables qui
-- renvoyaient des erreurs 500. Toutes les colonnes doivent afficher un nombre
-- (zéro ou plus), sans erreur "infinite recursion".
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', (SELECT id FROM auth.users WHERE email = 'admin@gmail.com'),
  'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT
  (SELECT count(*) FROM public.achats_immobiliers)   AS achats,
  (SELECT count(*) FROM public.online_rent_payments) AS paiements_en_ligne,
  (SELECT count(*) FROM public.reservations_vente)   AS reservations_vente,
  (SELECT count(*) FROM public.vente_prospects)      AS prospects_vente,
  (SELECT count(*) FROM public.agencies)             AS agences_visibles,
  (SELECT count(*) FROM public.echeances_parcelles)  AS echeances_lotissements;
ROLLBACK;
