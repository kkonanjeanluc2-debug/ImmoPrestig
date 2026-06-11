-- Optimisation des politiques de permissions granulaires.
-- Avant : has_member_permission_for_user(auth.uid(), user_id, 'perm') était
-- évaluée POUR CHAQUE LIGNE de chaque liste (4 EXISTS avec jointures par ligne).
-- Après : permitted_user_ids('perm') retourne l'ensemble des user_id accessibles ;
-- la sous-requête ne référence aucune colonne de la ligne, Postgres ne l'exécute
-- donc qu'UNE SEULE FOIS par requête (hashed subplan).

CREATE OR REPLACE FUNCTION public.permitted_user_ids(_permission text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admin : toutes les données
  SELECT u.id
  FROM auth.users u
  WHERE public.is_super_admin(auth.uid())
  UNION
  -- Propriétaire d'agence : ses données + celles de ses membres actifs
  SELECT a.user_id
  FROM public.agencies a
  WHERE a.user_id = auth.uid()
  UNION
  SELECT am.user_id
  FROM public.agencies a
  JOIN public.agency_members am ON am.agency_id = a.id
  WHERE a.user_id = auth.uid()
    AND am.status = 'active'
  UNION
  -- Membre admin : données du propriétaire et de tous les membres de son agence
  SELECT x.uid
  FROM public.agency_members actor
  JOIN public.agencies a ON a.id = actor.agency_id
  CROSS JOIN LATERAL (
    SELECT a.user_id AS uid
    UNION
    SELECT am2.user_id
    FROM public.agency_members am2
    WHERE am2.agency_id = actor.agency_id
      AND am2.status = 'active'
  ) x
  WHERE actor.user_id = auth.uid()
    AND actor.role = 'admin'::app_role
    AND actor.status = 'active'
  UNION
  -- Membre non-admin : mêmes données, seulement si la permission est cochée
  SELECT x.uid
  FROM public.agency_members actor
  JOIN public.agencies a ON a.id = actor.agency_id
  JOIN public.member_permissions mp ON mp.member_id = actor.id
  CROSS JOIN LATERAL (
    SELECT a.user_id AS uid
    UNION
    SELECT actor.user_id
    UNION
    SELECT am2.user_id
    FROM public.agency_members am2
    WHERE am2.agency_id = actor.agency_id
      AND am2.status = 'active'
  ) x
  WHERE actor.user_id = auth.uid()
    AND actor.status = 'active'
    AND actor.role <> 'admin'::app_role
    AND COALESCE((to_jsonb(mp) ->> _permission)::boolean, false)
  UNION
  -- Utilisateur seul (sans agence) : ses propres données
  SELECT auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.agency_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
$$;

REVOKE ALL ON FUNCTION public.permitted_user_ids(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.permitted_user_ids(text) TO authenticated;

-- Recrée les politiques 'perm ...' sous la forme ensembliste (rapide)
DO $$
DECLARE
  r record;
  pol_name text;
  cond text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('properties', 'SELECT', 'can_view_properties'),
      ('properties', 'INSERT', 'can_create_properties'),
      ('properties', 'UPDATE', 'can_edit_properties'),
      ('properties', 'DELETE', 'can_delete_properties'),
      ('tenants', 'SELECT', 'can_view_tenants'),
      ('tenants', 'INSERT', 'can_create_tenants'),
      ('tenants', 'UPDATE', 'can_edit_tenants'),
      ('tenants', 'DELETE', 'can_delete_tenants'),
      ('payments', 'SELECT', 'can_view_payments'),
      ('payments', 'INSERT', 'can_create_payments'),
      ('payments', 'UPDATE', 'can_edit_payments'),
      ('payments', 'DELETE', 'can_delete_payments'),
      ('owners', 'SELECT', 'can_view_owners'),
      ('owners', 'INSERT', 'can_create_owners'),
      ('owners', 'UPDATE', 'can_edit_owners'),
      ('owners', 'DELETE', 'can_delete_owners'),
      ('contracts', 'SELECT', 'can_view_contracts'),
      ('contracts', 'INSERT', 'can_create_contracts'),
      ('contracts', 'UPDATE', 'can_edit_contracts'),
      ('contracts', 'DELETE', 'can_delete_contracts'),
      ('documents', 'SELECT', 'can_view_documents'),
      ('documents', 'INSERT', 'can_create_documents'),
      ('documents', 'DELETE', 'can_delete_documents'),
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
      ('unpaid_cases', 'SELECT', 'can_view_impayes'),
      ('unpaid_cases', 'INSERT', 'can_create_impayes'),
      ('unpaid_cases', 'UPDATE', 'can_edit_impayes'),
      ('unpaid_cases', 'DELETE', 'can_delete_impayes'),
      ('unpaid_case_actions', 'SELECT', 'can_view_impayes'),
      ('unpaid_case_actions', 'INSERT', 'can_create_impayes_actions'),
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
    cond := format('user_id IN (SELECT public.permitted_user_ids(%L))', r.perm);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, r.tbl);
    IF r.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
        pol_name, r.tbl, cond
      );
    ELSIF r.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
        pol_name, r.tbl, cond, cond
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)',
        pol_name, r.tbl, r.cmd, cond
      );
    END IF;
  END LOOP;
END $$;

-- Vérification : politiques recréées en forme ensembliste
SELECT
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname LIKE 'perm %'
     AND (qual LIKE '%permitted_user_ids%' OR with_check LIKE '%permitted_user_ids%')) AS politiques_optimisees,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND policyname LIKE 'perm %') AS politiques_totales;
