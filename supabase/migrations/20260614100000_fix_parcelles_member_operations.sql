-- Correctif : modification d'un lot et prefinancement par les membres de l'équipe.
--
-- Problèmes identifiés :
-- 1. enregistrer_prefinancement() vérifiait agencies.user_id = parcelle.user_id.
--    Si la parcelle a été créée par un MEMBRE (pas le propriétaire d'agence),
--    aucune agence n'a user_id = membre → autorisation refusée → 500.
-- 2. La politique UPDATE de parcelles utilisait permitted_user_ids() qui est
--    correct mais ne couvre pas tous les cas de relation agence/membre.
--    Un SECURITY DEFINER explicite est plus sûr.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fonction SECURITY DEFINER : un utilisateur peut-il modifier un lot donné ?
--    Couvre les 4 cas de relation :
--      a) Créateur direct du lot
--      b) Propriétaire d'agence dont le créateur est un membre actif
--      c) Membre actif de l'agence dont le créateur est le propriétaire
--         (requiert can_edit_lotissements)
--      d) Deux membres actifs de la même agence, l'un ayant can_edit_lotissements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_edit_lot(_lot_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- a) Appelant = créateur du lot
    auth.uid() = _lot_user_id

    -- b) Propriétaire d'agence modifie un lot de son membre
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id  = auth.uid()
        AND am.user_id = _lot_user_id
        AND am.status  = 'active'
    )

    -- c) Membre (avec can_edit_lotissements) modifie un lot du propriétaire d'agence
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      JOIN public.member_permissions mp ON mp.member_id = am.id
      WHERE a.user_id  = _lot_user_id
        AND am.user_id = auth.uid()
        AND am.status  = 'active'
        AND mp.can_edit_lotissements = true
    )

    -- d) Membre (avec can_edit_lotissements) modifie un lot d'un co-membre
    OR EXISTS (
      SELECT 1
      FROM public.agency_members am_createur
      JOIN public.agency_members am_appelant
        ON am_appelant.agency_id = am_createur.agency_id
      JOIN public.member_permissions mp ON mp.member_id = am_appelant.id
      WHERE am_createur.user_id = _lot_user_id
        AND am_createur.status  = 'active'
        AND am_appelant.user_id = auth.uid()
        AND am_appelant.status  = 'active'
        AND mp.can_edit_lotissements = true
    )
  )
$$;

REVOKE ALL ON FUNCTION public.can_edit_lot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_lot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_lot(uuid) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Remplacement de la politique UPDATE sur parcelles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perm update can_edit_lotissements" ON public.parcelles;
CREATE POLICY "perm update can_edit_lotissements"
ON public.parcelles FOR UPDATE TO authenticated
USING     (public.can_edit_lot(user_id))
WITH CHECK(public.can_edit_lot(user_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Correction de enregistrer_prefinancement :
--    autoriser tout membre actif de la même agence que le créateur du lot,
--    quelle que soit la relation (propriétaire ↔ membre ou membre ↔ membre).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enregistrer_prefinancement(
  _parcelle_id     uuid,
  _prefinanceur_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lot_user_id uuid;
  _authorized  boolean;
BEGIN
  -- Récupère le créateur du lot
  SELECT user_id INTO _lot_user_id
  FROM public.parcelles
  WHERE id = _parcelle_id AND deleted_at IS NULL;

  IF _lot_user_id IS NULL THEN
    RAISE EXCEPTION 'Parcelle introuvable';
  END IF;

  -- Réutilise can_edit_lot() qui couvre les 4 cas de relation agence/membre.
  -- Pour le préfinancement on élargit : tout membre actif de la même agence
  -- est autorisé, sans exiger can_edit_lotissements.
  SELECT (
    -- a) L'appelant a créé le lot
    auth.uid() = _lot_user_id

    -- b) Propriétaire d'agence, créateur = l'un de ses membres actifs
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id  = auth.uid()
        AND am.user_id = _lot_user_id
        AND am.status  = 'active'
    )

    -- c) Membre actif, créateur = propriétaire de son agence
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id  = _lot_user_id
        AND am.user_id = auth.uid()
        AND am.status  = 'active'
    )

    -- d) Deux membres actifs de la même agence
    OR EXISTS (
      SELECT 1
      FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _lot_user_id
        AND am1.status  = 'active'
        AND am2.user_id = auth.uid()
        AND am2.status  = 'active'
    )
  ) INTO _authorized;

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Non autorisé à effectuer un préfinancement sur cette parcelle';
  END IF;

  UPDATE public.parcelles
  SET
    status          = 'prefinance',
    prefinanceur_id = _prefinanceur_id,
    updated_at      = now()
  WHERE id = _parcelle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_prefinancement(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Ajout de politiques INSERT/UPDATE manquantes pour ventes_parcelles
--    (les anciennes politiques auth.uid() = user_id existent déjà mais
--    ne permettent pas à un propriétaire de voir les ventes de ses membres)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perm insert can_create_ventes_parcelles" ON public.ventes_parcelles;
CREATE POLICY "perm insert can_create_ventes_parcelles"
ON public.ventes_parcelles FOR INSERT TO authenticated
WITH CHECK (
  -- Propriétaire crée la vente (user_id = son propre ID ou celui d'un membre)
  user_id IN (SELECT public.permitted_user_ids('can_view_lotissements'))
  -- Ou membre autorisé : n'importe quel membre actif de l'agence peut vendre un lot
  OR EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.user_id   = auth.uid()
      AND am.status    = 'active'
  )
);

DROP POLICY IF EXISTS "perm update can_edit_ventes_parcelles" ON public.ventes_parcelles;
CREATE POLICY "perm update can_edit_ventes_parcelles"
ON public.ventes_parcelles FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT public.permitted_user_ids('can_view_lotissements'))
)
WITH CHECK (
  user_id IN (SELECT public.permitted_user_ids('can_view_lotissements'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Vérification
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'parcelles'
     AND policyname LIKE 'perm update%') AS politiques_parcelles_update,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'ventes_parcelles') AS politiques_ventes_parcelles,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'can_edit_lot') AS fonction_can_edit_lot,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'enregistrer_prefinancement') AS fonction_prefinancement;
