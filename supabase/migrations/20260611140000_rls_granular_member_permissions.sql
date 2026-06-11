-- Prise en compte des permissions accordées dans les paramètres (member_permissions)
-- 1. has_member_permission_for_user : lecture dynamique de la colonne de permission
--    (avant : CASE codé en dur sur ~13 permissions, ELSE false => toutes les autres refusées)
-- 2. Politiques RLS additives basées sur les permissions granulaires pour les tables métier
--    (avant : la plupart des tables n'autorisaient que admin / propriétaire d'agence)

CREATE OR REPLACE FUNCTION public.has_member_permission_for_user(_actor_user_id uuid, _target_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_super_admin(_actor_user_id)
    -- Propriétaire d'agence : accès à ses données et à celles de ses membres
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      WHERE a.user_id = _actor_user_id
        AND (
          a.user_id = _target_user_id
          OR EXISTS (
            SELECT 1
            FROM public.agency_members target
            WHERE target.agency_id = a.id
              AND target.user_id = _target_user_id
              AND target.status = 'active'
          )
        )
    )
    -- Membre admin : accès complet aux données de son agence
    OR EXISTS (
      SELECT 1
      FROM public.agency_members actor
      JOIN public.agencies a ON a.id = actor.agency_id
      WHERE actor.user_id = _actor_user_id
        AND actor.role = 'admin'::app_role
        AND actor.status = 'active'
        AND (
          a.user_id = _target_user_id
          OR EXISTS (
            SELECT 1
            FROM public.agency_members target
            WHERE target.agency_id = actor.agency_id
              AND target.user_id = _target_user_id
              AND target.status = 'active'
          )
        )
    )
    -- Membre non-admin : la permission demandée est lue dynamiquement
    -- dans sa ligne member_permissions (couvre toutes les colonnes can_*)
    OR EXISTS (
      SELECT 1
      FROM public.agency_members actor
      JOIN public.agencies a ON a.id = actor.agency_id
      JOIN public.member_permissions mp ON mp.member_id = actor.id
      WHERE actor.user_id = _actor_user_id
        AND actor.status = 'active'
        AND actor.role <> 'admin'::app_role
        AND (
          a.user_id = _target_user_id
          OR actor.user_id = _target_user_id
          OR EXISTS (
            SELECT 1
            FROM public.agency_members target
            WHERE target.agency_id = actor.agency_id
              AND target.user_id = _target_user_id
              AND target.status = 'active'
          )
        )
        AND COALESCE((to_jsonb(mp) ->> _permission)::boolean, false)
    )
    -- Utilisateur seul (sans agence) : accès à ses propres données
    OR (
      _actor_user_id = _target_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.agency_members actor
        WHERE actor.user_id = _actor_user_id
          AND actor.status = 'active'
      )
    )
$function$;

REVOKE ALL ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO authenticated;

-- Politiques additives : elles s'ajoutent (OR) aux politiques existantes,
-- elles ne retirent aucun accès existant.
DO $$
DECLARE
  r record;
  pol_name text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Biens immobiliers
      ('properties', 'SELECT', 'can_view_properties'),
      ('properties', 'INSERT', 'can_create_properties'),
      ('properties', 'UPDATE', 'can_edit_properties'),
      ('properties', 'DELETE', 'can_delete_properties'),
      -- Locataires
      ('tenants', 'SELECT', 'can_view_tenants'),
      ('tenants', 'INSERT', 'can_create_tenants'),
      ('tenants', 'UPDATE', 'can_edit_tenants'),
      ('tenants', 'DELETE', 'can_delete_tenants'),
      -- Paiements
      ('payments', 'SELECT', 'can_view_payments'),
      ('payments', 'INSERT', 'can_create_payments'),
      ('payments', 'UPDATE', 'can_edit_payments'),
      ('payments', 'DELETE', 'can_delete_payments'),
      -- Propriétaires
      ('owners', 'SELECT', 'can_view_owners'),
      ('owners', 'INSERT', 'can_create_owners'),
      ('owners', 'UPDATE', 'can_edit_owners'),
      ('owners', 'DELETE', 'can_delete_owners'),
      -- Contrats
      ('contracts', 'SELECT', 'can_view_contracts'),
      ('contracts', 'INSERT', 'can_create_contracts'),
      ('contracts', 'UPDATE', 'can_edit_contracts'),
      ('contracts', 'DELETE', 'can_delete_contracts'),
      -- Documents
      ('documents', 'SELECT', 'can_view_documents'),
      ('documents', 'INSERT', 'can_create_documents'),
      ('documents', 'DELETE', 'can_delete_documents'),
      -- Lotissements et sous-entités
      ('lotissements', 'SELECT', 'can_view_lotissements'),
      ('lotissements', 'INSERT', 'can_create_lotissements'),
      ('lotissements', 'UPDATE', 'can_edit_lotissements'),
      ('lotissements', 'DELETE', 'can_delete_lotissements'),
      ('ilots', 'SELECT', 'can_view_lotissements'),
      ('ilots', 'INSERT', 'can_create_ilots'),
      ('ilots', 'UPDATE', 'can_edit_lotissements'),
      ('ilots', 'DELETE', 'can_delete_lotissements'),
      ('parcelles', 'SELECT', 'can_view_lotissements'),
      ('parcelles', 'INSERT', 'can_create_parcelles'),
      ('parcelles', 'UPDATE', 'can_edit_lotissements'),
      ('parcelles', 'DELETE', 'can_delete_lotissements'),
      ('lotissement_documents', 'SELECT', 'can_view_lotissements'),
      ('lotissement_documents', 'INSERT', 'can_create_lotissement_documents'),
      ('demarches_administratives', 'SELECT', 'can_view_lotissements'),
      ('demarches_administratives', 'INSERT', 'can_create_demarches'),
      ('demarches_administratives', 'UPDATE', 'can_edit_lotissements'),
      ('parcelle_prospects', 'SELECT', 'can_view_lotissements'),
      ('parcelle_prospects', 'INSERT', 'can_create_lotissement_prospects'),
      ('parcelle_prospects', 'UPDATE', 'can_edit_lotissements'),
      ('mutations_parcelles', 'SELECT', 'can_view_lotissements'),
      ('mutations_parcelles', 'INSERT', 'can_manage_mutations_parcelle'),
      ('mutations_parcelles', 'UPDATE', 'can_manage_mutations_parcelle'),
      ('mutations_parcelles', 'DELETE', 'can_manage_mutations_parcelle'),
      ('reservations_parcelles', 'SELECT', 'can_view_lotissements'),
      ('ventes_parcelles', 'SELECT', 'can_view_lotissements'),
      ('echeances_parcelles', 'SELECT', 'can_view_echeances_lotissements'),
      ('echeances_parcelles', 'UPDATE', 'can_collect_echeances_lotissements'),
      -- Ventes immobilières et sous-entités
      ('ventes_immobilieres', 'INSERT', 'can_create_ventes'),
      ('biens_vente', 'INSERT', 'can_create_biens_vente'),
      ('biens_vente', 'UPDATE', 'can_edit_biens_vente'),
      ('biens_vente_images', 'SELECT', 'can_view_ventes'),
      ('biens_vente_images', 'INSERT', 'can_create_biens_vente'),
      ('acquereurs', 'INSERT', 'can_create_ventes'),
      ('acquereurs', 'UPDATE', 'can_edit_ventes'),
      ('vente_prospects', 'SELECT', 'can_view_ventes'),
      ('vente_prospects', 'INSERT', 'can_create_vente_prospects'),
      ('vente_prospects', 'UPDATE', 'can_edit_ventes'),
      ('echeances_ventes', 'SELECT', 'can_view_echeances_ventes'),
      ('echeances_ventes', 'INSERT', 'can_create_ventes'),
      ('echeances_ventes', 'UPDATE', 'can_collect_echeances_ventes'),
      -- Achats immobiliers et sous-entités
      ('achats_immobiliers', 'SELECT', 'can_view_achats'),
      ('achats_immobiliers', 'INSERT', 'can_create_achats'),
      ('achats_immobiliers', 'UPDATE', 'can_edit_achats'),
      ('achats_immobiliers', 'DELETE', 'can_delete_achats'),
      ('biens_achat', 'SELECT', 'can_view_achats'),
      ('biens_achat', 'INSERT', 'can_create_achats'),
      ('biens_achat', 'UPDATE', 'can_edit_achats'),
      ('biens_achat', 'DELETE', 'can_delete_achats'),
      ('vendeurs', 'SELECT', 'can_view_achats'),
      ('vendeurs', 'INSERT', 'can_create_achats'),
      ('vendeurs', 'UPDATE', 'can_edit_achats'),
      ('offres_achat', 'SELECT', 'can_view_achats'),
      ('offres_achat', 'INSERT', 'can_create_offres_achat'),
      ('offres_achat', 'UPDATE', 'can_edit_achats'),
      ('documents_achats', 'SELECT', 'can_view_achats'),
      ('documents_achats', 'INSERT', 'can_create_achats_documents'),
      ('mutations_achats', 'SELECT', 'can_view_achats'),
      ('mutations_achats', 'INSERT', 'can_manage_mutations'),
      ('mutations_achats', 'UPDATE', 'can_manage_mutations'),
      ('mutations_achats', 'DELETE', 'can_manage_mutations'),
      ('echeances_achats', 'SELECT', 'can_view_echeances_achats'),
      ('echeances_achats', 'INSERT', 'can_create_achats'),
      ('echeances_achats', 'UPDATE', 'can_collect_echeances_achats'),
      -- Impayés
      ('unpaid_cases', 'SELECT', 'can_view_impayes'),
      ('unpaid_cases', 'INSERT', 'can_create_impayes'),
      ('unpaid_cases', 'UPDATE', 'can_edit_impayes'),
      ('unpaid_cases', 'DELETE', 'can_delete_impayes'),
      ('unpaid_case_actions', 'SELECT', 'can_view_impayes'),
      ('unpaid_case_actions', 'INSERT', 'can_create_impayes_actions'),
      -- Comptabilité
      ('expenses', 'SELECT', 'can_view_comptabilite'),
      ('expenses', 'INSERT', 'can_create_expenses'),
      ('proforma_invoices', 'SELECT', 'can_view_invoices'),
      ('proforma_invoices', 'INSERT', 'can_create_invoices'),
      ('proforma_invoices', 'DELETE', 'can_delete_invoices'),
      ('owner_payouts', 'SELECT', 'can_view_owner_payouts'),
      ('owner_payouts', 'INSERT', 'can_create_owner_payouts')
    ) AS t(tbl, cmd, perm)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      RAISE NOTICE 'Table public.% absente : politique ignoree', r.tbl;
      CONTINUE;
    END IF;
    pol_name := format('perm %s %s', lower(r.cmd), r.perm);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, r.tbl);
    IF r.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, %L))',
        pol_name, r.tbl, r.perm
      );
    ELSIF r.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_member_permission_for_user(auth.uid(), user_id, %L)) WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, %L))',
        pol_name, r.tbl, r.perm, r.perm
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (public.has_member_permission_for_user(auth.uid(), user_id, %L))',
        pol_name, r.tbl, r.cmd, r.perm
      );
    END IF;
  END LOOP;
END $$;

-- Vérification : la dernière ligne du résultat doit montrer
-- fonction_dynamique = true et politiques_permissions > 90
SELECT
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'has_member_permission_for_user'
      AND p.prosrc LIKE '%to_jsonb%'
  ) AS fonction_dynamique,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND policyname LIKE 'perm %') AS politiques_permissions,
  (SELECT count(*) FROM public.member_permissions) AS lignes_member_permissions,
  (SELECT count(*) FROM public.agency_members WHERE status = 'active') AS membres_actifs;
