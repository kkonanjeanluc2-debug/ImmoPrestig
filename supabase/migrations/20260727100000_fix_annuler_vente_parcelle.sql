-- ============================================================
-- FIX : un commercial avec la permission can_cancel_vente_parcelle
--       doit pouvoir annuler une vente de lot.
--
-- Problèmes identifiés :
--   1. annuler_vente_parcelle() n'était pas en SECURITY DEFINER →
--      les DELETE/UPDATE étaient évalués sous les RLS du commercial,
--      qui n'a aucune politique DELETE sur ventes_parcelles.
--   2. Aucune politique DELETE n'existe sur ventes_parcelles pour
--      les membres ayant can_cancel_vente_parcelle.
--
-- Solution :
--   A. Recréer annuler_vente_parcelle() en SECURITY DEFINER avec
--      vérification d'autorisation exhaustive (4 cas).
--   B. Ajouter la politique DELETE sur ventes_parcelles.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Fonction SECURITY DEFINER annuler_vente_parcelle
--    Autorisé si :
--      a) Créateur de la vente (ventes_parcelles.user_id = auth.uid())
--      b) Propriétaire d'agence dont le créateur est un membre actif
--      c) Membre admin de l'agence du créateur
--      d) Membre actif avec can_cancel_vente_parcelle = true
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.annuler_vente_parcelle(
  _vente_id   uuid,
  _parcelle_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vente_user_id uuid;
  _authorized    boolean;
BEGIN
  -- Récupère le créateur de la vente
  SELECT user_id INTO _vente_user_id
  FROM public.ventes_parcelles
  WHERE id = _vente_id;

  IF _vente_user_id IS NULL THEN
    RAISE EXCEPTION 'Vente introuvable : %', _vente_id;
  END IF;

  -- Vérification d'autorisation
  SELECT (
    -- a) L'appelant est le créateur de la vente
    auth.uid() = _vente_user_id

    -- b) Propriétaire d'agence, créateur = l'un de ses membres actifs
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id  = auth.uid()
        AND am.user_id = _vente_user_id
        AND am.status  = 'active'
    )

    -- c) Propriétaire d'agence dont le créateur EST le propriétaire
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.user_id = auth.uid()
        AND a.user_id = _vente_user_id
    )

    -- d) Membre admin de l'agence du créateur (co-membre ou agence du propriétaire)
    OR EXISTS (
      SELECT 1
      FROM public.agency_members am_appelant
      JOIN public.agencies a ON a.id = am_appelant.agency_id
      WHERE am_appelant.user_id = auth.uid()
        AND am_appelant.role    = 'admin'::app_role
        AND am_appelant.status  = 'active'
        AND (
          -- Créateur = propriétaire de l'agence
          a.user_id = _vente_user_id
          OR
          -- Créateur = co-membre actif
          EXISTS (
            SELECT 1
            FROM public.agency_members am_createur
            WHERE am_createur.agency_id = am_appelant.agency_id
              AND am_createur.user_id   = _vente_user_id
              AND am_createur.status    = 'active'
          )
        )
    )

    -- e) Membre actif avec permission can_cancel_vente_parcelle
    OR EXISTS (
      SELECT 1
      FROM public.agency_members am_appelant
      JOIN public.member_permissions mp ON mp.member_id = am_appelant.id
      WHERE am_appelant.user_id = auth.uid()
        AND am_appelant.status  = 'active'
        AND mp.can_cancel_vente_parcelle = true
        AND (
          -- Créateur = propriétaire de l'agence
          EXISTS (
            SELECT 1 FROM public.agencies a
            WHERE a.id      = am_appelant.agency_id
              AND a.user_id = _vente_user_id
          )
          OR
          -- Créateur = co-membre actif de la même agence
          EXISTS (
            SELECT 1
            FROM public.agency_members am_createur
            WHERE am_createur.agency_id = am_appelant.agency_id
              AND am_createur.user_id   = _vente_user_id
              AND am_createur.status    = 'active'
          )
          OR
          -- Créateur = l'appelant lui-même
          _vente_user_id = auth.uid()
        )
    )
  ) INTO _authorized;

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Non autorisé à annuler cette vente';
  END IF;

  -- 1. Supprimer les échéances liées à cette vente
  DELETE FROM public.echeances_parcelles
  WHERE vente_id = _vente_id;

  -- 2. Supprimer la vente
  DELETE FROM public.ventes_parcelles
  WHERE id = _vente_id;

  -- 3. Remettre le lot en disponible
  UPDATE public.parcelles
  SET
    status          = 'disponible',
    beneficiaire_id = NULL,
    updated_at      = now()
  WHERE id = _parcelle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.annuler_vente_parcelle(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annuler_vente_parcelle(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Politique DELETE sur ventes_parcelles
--    Permet aux propriétaires, admins et membres avec can_cancel_vente_parcelle
--    de supprimer des ventes (fallback si la fonction RPC n'est pas utilisée).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perm delete can_cancel_vente_parcelle" ON public.ventes_parcelles;
CREATE POLICY "perm delete can_cancel_vente_parcelle"
ON public.ventes_parcelles FOR DELETE TO authenticated
USING (
  user_id IN (SELECT public.permitted_user_ids('can_cancel_vente_parcelle'))
  OR user_id IN (SELECT public.permitted_user_ids('can_view_lotissements'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vérification
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'annuler_vente_parcelle') AS fn_annuler_vente,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'ventes_parcelles'
     AND cmd        = 'DELETE') AS delete_policies_ventes_parcelles;
