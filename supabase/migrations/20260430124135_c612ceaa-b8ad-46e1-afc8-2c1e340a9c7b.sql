
-- Helper: actor is an active admin member of the agency belonging to _owner_user_id
CREATE OR REPLACE FUNCTION public.is_admin_of_owner(_actor uuid, _owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = _owner_user_id
      AND am.user_id = _actor
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
  )
$$;

-- For each business table whose existing policies are scoped to "user_id = auth.uid()",
-- add a permissive policy granting the same right to agency admins (members with role=admin).
-- Permissive policies are OR-combined with existing ones, so we just extend access.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'achat_contract_templates','achat_signatures','acquereurs','acquisitions',
    'attestation_templates','biens_achat','biens_vente','biens_vente_images',
    'colocation_contract_templates','colocation_tenants','contract_signatures',
    'contract_templates','contracts','demarches_administratives','documents',
    'documents_achats','echeances_achats','echeances_parcelles','echeances_ventes',
    'etats_des_lieux','expenses','guide_templates','ilots','inventory_items',
    'lotissement_documents','lotissements','management_contract_templates',
    'management_types','mutations_achats','mutations_parcelles','offres_achat',
    'online_rent_payments','owners','parcelle_admin_status','parcelle_prospects',
    'parcelles','payments','payout_signatures','payouts','proforma_invoices',
    'promesse_vente_templates','properties','property_images','property_interventions',
    'property_inventories','property_units','receipt_templates','reservation_form_templates',
    'reservations_parcelles','reservations_vente','sale_contract_templates',
    'tenant_requests','tenants','unpaid_case_actions','unpaid_cases','vendeurs',
    'vente_prospects','vente_signatures','ventes_immobilieres','ventes_parcelles',
    'whatsapp_logs','withdrawal_requests','automation_schedules','email_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip if table doesn't exist or has no user_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='user_id'
    ) THEN
      CONTINUE;
    END IF;

    -- Drop previous version of our policies if re-running
    EXECUTE format('DROP POLICY IF EXISTS "Agency admins act as owner select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Agency admins act as owner insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Agency admins act as owner update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Agency admins act as owner delete" ON public.%I', t);

    EXECUTE format($f$
      CREATE POLICY "Agency admins act as owner select" ON public.%I
      FOR SELECT TO authenticated
      USING (public.is_admin_of_owner(auth.uid(), user_id))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Agency admins act as owner insert" ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin_of_owner(auth.uid(), user_id))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Agency admins act as owner update" ON public.%I
      FOR UPDATE TO authenticated
      USING (public.is_admin_of_owner(auth.uid(), user_id))
      WITH CHECK (public.is_admin_of_owner(auth.uid(), user_id))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Agency admins act as owner delete" ON public.%I
      FOR DELETE TO authenticated
      USING (public.is_admin_of_owner(auth.uid(), user_id))
    $f$, t);
  END LOOP;
END $$;
