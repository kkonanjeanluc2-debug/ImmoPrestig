-- ============================================================
-- CORRECTIF SYSTÉMIQUE — Audit RLS complet 2026-07-27
--
-- Problèmes corrigés :
--  1. Policies UPDATE/DELETE manquantes sur expenses,
--     lotissement_documents, demarches_administratives,
--     owner_payouts, biens_vente, acquereurs, proforma_invoices
--  2. Policy INSERT manquante sur reservations_parcelles
--  3. Policy SELECT manquante sur acquereurs (membres)
--  4. Membres admin ne peuvent pas voir/modifier les permissions
--     de leurs co-membres (gestion d'équipe bloquée)
--  5. Nouvelles colonnes member_permissions pour les opérations
--     sensibles (DELETE expenses, DELETE owner_payouts)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Nouvelles colonnes member_permissions
--    (opérations non couvertes par les colonnes existantes)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_delete_expenses      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_owner_payouts boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 2. Extension du système permitted_user_ids
--    Toutes ces opérations réutilisent des colonnes existantes
--    sauf les deux nouvelles ci-dessus.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r        record;
  pol_name text;
  cond     text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- expenses : UPDATE (même niveau que création) + DELETE (nouvelle colonne)
      ('expenses',                    'UPDATE', 'can_create_expenses'),
      ('expenses',                    'DELETE', 'can_delete_expenses'),
      -- lotissement_documents : UPDATE/DELETE manquants
      ('lotissement_documents',       'UPDATE', 'can_edit_lotissements'),
      ('lotissement_documents',       'DELETE', 'can_delete_lotissements'),
      -- demarches_administratives : DELETE manquant
      ('demarches_administratives',   'DELETE', 'can_delete_lotissements'),
      -- owner_payouts : UPDATE + DELETE manquants
      ('owner_payouts',               'UPDATE', 'can_create_owner_payouts'),
      ('owner_payouts',               'DELETE', 'can_delete_owner_payouts'),
      -- biens_vente : DELETE manquant
      ('biens_vente',                 'DELETE', 'can_delete_ventes'),
      -- acquereurs : SELECT + DELETE manquants
      ('acquereurs',                  'SELECT', 'can_view_ventes'),
      ('acquereurs',                  'DELETE', 'can_delete_ventes'),
      -- reservations_parcelles : INSERT manquant
      ('reservations_parcelles',      'INSERT', 'can_create_lotissement_prospects'),
      -- proforma_invoices : UPDATE manquant
      ('proforma_invoices',           'UPDATE', 'can_create_invoices')
    ) AS t(tbl, cmd, perm)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      RAISE NOTICE 'Table public.% absente : ignorée', r.tbl;
      CONTINUE;
    END IF;

    pol_name := format('perm %s %s', lower(r.cmd), r.perm);
    cond     := format('user_id IN (SELECT public.permitted_user_ids(%L))', r.perm);

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
    ELSE -- SELECT ou DELETE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)',
        pol_name, r.tbl, r.cmd, cond
      );
    END IF;

    RAISE NOTICE 'Policy créée : % % %', r.cmd, r.tbl, pol_name;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Membres ADMIN peuvent voir et modifier les permissions
--    de leurs co-membres (gestion d'équipe depuis l'interface)
-- ─────────────────────────────────────────────────────────────

-- SELECT : admin-membre voit les permissions de son agence
DROP POLICY IF EXISTS "Admin members can view co-member permissions" ON public.member_permissions;
CREATE POLICY "Admin members can view co-member permissions"
ON public.member_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_members am_admin
    JOIN public.agency_members am_target
      ON am_target.agency_id = am_admin.agency_id
    WHERE am_admin.user_id = auth.uid()
      AND am_admin.role    = 'admin'::app_role
      AND am_admin.status  = 'active'
      AND am_target.id     = member_permissions.member_id
  )
);

-- UPDATE : admin-membre peut modifier les permissions de ses co-membres
DROP POLICY IF EXISTS "Admin members can update co-member permissions" ON public.member_permissions;
CREATE POLICY "Admin members can update co-member permissions"
ON public.member_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_members am_admin
    JOIN public.agency_members am_target
      ON am_target.agency_id = am_admin.agency_id
    WHERE am_admin.user_id = auth.uid()
      AND am_admin.role    = 'admin'::app_role
      AND am_admin.status  = 'active'
      AND am_target.id     = member_permissions.member_id
  )
);

-- ─────────────────────────────────────────────────────────────
-- 4. Vérification finale
-- ─────────────────────────────────────────────────────────────
SELECT
  tablename,
  cmd,
  count(*) AS nb_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'expenses','lotissement_documents','demarches_administratives',
    'owner_payouts','biens_vente','acquereurs',
    'reservations_parcelles','proforma_invoices','member_permissions'
  )
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
