-- Corrige l'affichage du nom du préfinanceur chez l'admin (liste des ventes + guide lotissement).
-- L'ancienne politique SELECT ne couvrait que le créateur de la ligne et les admins des agences
-- POSSÉDÉES par le créateur. Un commercial ne possédant pas d'agence, les préfinanceurs qu'il
-- créait étaient invisibles pour l'admin/propriétaire (et inversement, le commercial ne voyait
-- pas les préfinanceurs créés par l'admin dans la liste "Existant").

DROP POLICY IF EXISTS "Users manage own prefinanceurs select" ON public.prefinanceurs;

CREATE POLICY "Agency members can view prefinanceurs"
ON public.prefinanceurs FOR SELECT
USING (
  -- Créateur de la ligne
  auth.uid() = user_id
  -- Admin d'une agence possédée par le créateur
  OR public.is_admin_of_owner(auth.uid(), user_id)
  -- Propriétaire d'une agence dont le créateur est membre actif (admin voit les lignes du commercial)
  OR public.is_team_member_of_owned_agency(auth.uid(), user_id)
  -- Membre actif d'une agence possédée par le créateur (commercial voit les lignes du propriétaire)
  OR public.is_team_member_of_owned_agency(user_id, auth.uid())
  -- Deux membres actifs de la même agence (commercial voit les lignes d'un autre membre)
  OR EXISTS (
    SELECT 1
    FROM public.agency_members am1
    JOIN public.agency_members am2 ON am2.agency_id = am1.agency_id
    WHERE am1.user_id = auth.uid()
      AND am1.status = 'active'
      AND am2.user_id = prefinanceurs.user_id
      AND am2.status = 'active'
  )
);
