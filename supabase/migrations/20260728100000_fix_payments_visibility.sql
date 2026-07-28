-- ============================================================
-- FIX : paiements invisibles quand leur créateur est un
--       ex-membre désactivé de l'agence
--
-- Problème :
--   La policy SELECT sur payments utilise uniquement :
--     user_id IN (permitted_user_ids('can_view_payments'))
--   permitted_user_ids ne retourne que les membres ACTIFS
--   (am.status = 'active'). Si un commercial est désactivé
--   APRÈS avoir créé des paiements, ces paiements disparaissent
--   du portfolio du propriétaire → mois marqués "Retard" à tort.
--
-- Solution :
--   Ajouter une policy alternative basée sur le locataire :
--   un paiement est visible si son tenant_id appartient
--   au portfolio du propriétaire/admin connecté.
--   Cela couvre aussi les paiements créés par des membres
--   désactivés ou supprimés.
-- ============================================================

-- Policy supplémentaire : accès via le locataire du paiement
-- (indépendante du créateur du paiement)
DROP POLICY IF EXISTS "View payments via accessible tenant" ON public.payments;
CREATE POLICY "View payments via accessible tenant"
ON public.payments FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT t.id
    FROM public.tenants t
    WHERE t.user_id IN (SELECT public.permitted_user_ids('can_view_tenants'))
      AND t.deleted_at IS NULL
  )
  OR
  -- Aussi : paiement sans tenant mais créé par un utilisateur accessible
  (tenant_id IS NULL AND user_id IN (SELECT public.permitted_user_ids('can_view_payments')))
);

-- Vérification
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'payments'
ORDER BY cmd, policyname;
