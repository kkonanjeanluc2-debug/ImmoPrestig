CREATE OR REPLACE FUNCTION public.has_agency_role_access_to_user(
  _user_id uuid,
  _target_user_id uuid,
  _roles app_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members actor
    JOIN public.agencies a ON a.id = actor.agency_id
    WHERE actor.user_id = _user_id
      AND actor.role = ANY(_roles)
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
$$;

CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _parcelle_user_id
    OR _user_id = _assigned_to
    OR public.has_agency_role_access_to_user(_user_id, _parcelle_user_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.member_user_id = _user_id
        AND p.user_id = _parcelle_user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid, _beneficiaire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _parcelle_user_id
    OR _user_id = _assigned_to
    OR public.has_agency_role_access_to_user(_user_id, _parcelle_user_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1
      FROM public.beneficiaires_lots bl
      WHERE bl.id = _beneficiaire_id
        AND bl.member_user_id = _user_id
        AND bl.user_id = _parcelle_user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_v2(_user_id uuid, _tenant_user_id uuid, _assigned_to uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _tenant_user_id
    OR _user_id = _assigned_to
    OR public.has_agency_role_access_to_user(_user_id, _tenant_user_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _tenant_user_id
    )
    OR (
      _property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.properties p
        WHERE p.id = _property_id
          AND p.assigned_to = _user_id
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_vente(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _assigned_to
    OR public.is_super_admin(_user_id)
    OR (
      _user_id = _bien_user_id
      AND (public.has_role(_user_id, 'admin'::app_role) OR public.is_super_admin(_user_id))
    )
    OR public.has_agency_role_access_to_user(_user_id, _bien_user_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _bien_user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_lotissement(_user_id uuid, _owner_id uuid, _lotissement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _owner_id
    OR public.has_agency_role_access_to_user(_user_id, _owner_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.lotissement_id = _lotissement_id
        AND p.assigned_to = _user_id
        AND p.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.lotissement_id = _lotissement_id
        AND bl.member_user_id = _user_id
        AND p.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      JOIN public.parcelles p ON p.lotissement_id = _lotissement_id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'gestionnaire'::app_role
        AND am.status = 'active'
        AND p.status = 'disponible'::plot_status
        AND p.deleted_at IS NULL
      LIMIT 1
    )
$$;

CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_parcelle(_user_id uuid, _owner_id uuid, _parcelle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = _owner_id
    OR public.has_agency_role_access_to_user(_user_id, _owner_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.id = _parcelle_id
        AND p.assigned_to = _user_id
    )
$$;

DROP POLICY IF EXISTS "Comptables can view agency achats_immobiliers" ON public.achats_immobiliers;
CREATE POLICY "Comptables can view agency achats_immobiliers"
ON public.achats_immobiliers
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Comptables can view agency biens_achat" ON public.biens_achat;
CREATE POLICY "Comptables can view agency biens_achat"
ON public.biens_achat
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Comptables can view agency biens_vente" ON public.biens_vente;
CREATE POLICY "Comptables can view agency biens_vente"
ON public.biens_vente
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Comptables can view agency contacts achat" ON public.acquereurs;
CREATE POLICY "Comptables can view agency contacts achat"
ON public.acquereurs
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Comptables can view agency offres achat" ON public.offres_achat;
CREATE POLICY "Comptables can view agency offres achat"
ON public.offres_achat
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Comptables can view agency vendeurs" ON public.vendeurs;
CREATE POLICY "Comptables can view agency vendeurs"
ON public.vendeurs
FOR SELECT
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['comptable'::app_role]));

DROP POLICY IF EXISTS "Owners admins accountants and cashiers can update payments" ON public.payments;
DROP POLICY IF EXISTS "Owners admins and comptables can update payments" ON public.payments;
CREATE POLICY "Owners admins accountants and cashiers can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
);

DROP POLICY IF EXISTS "Users can update accessible echeances_parcelles" ON public.echeances_parcelles;
CREATE POLICY "Users can update accessible echeances_parcelles"
ON public.echeances_parcelles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.ventes_parcelles vp
    JOIN public.parcelles p ON p.id = vp.parcelle_id
    WHERE vp.id = echeances_parcelles.vente_id
      AND (
        p.assigned_to = auth.uid()
        OR public.has_agency_role_access_to_user(auth.uid(), vp.user_id, ARRAY['admin'::app_role, 'caissiere'::app_role, 'comptable'::app_role])
      )
  )
);

DROP POLICY IF EXISTS "Agency finance roles can update invoices" ON public.proforma_invoices;
CREATE POLICY "Agency finance roles can update invoices"
ON public.proforma_invoices
FOR UPDATE
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role]));

DROP POLICY IF EXISTS "Agency finance roles can delete invoices" ON public.proforma_invoices;
CREATE POLICY "Agency finance roles can delete invoices"
ON public.proforma_invoices
FOR DELETE
TO authenticated
USING (public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role]));