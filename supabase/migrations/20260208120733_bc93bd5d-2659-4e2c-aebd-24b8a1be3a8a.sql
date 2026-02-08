-- Function to check if a gestionnaire can access a lotissement
-- (via assigned parcelles or being the owner/admin)
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_lotissement(
  _user_id uuid,
  _owner_id uuid,
  _lotissement_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Is the owner
    _user_id = _owner_id
    -- Or has assigned parcelles in this lotissement
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.lotissement_id = _lotissement_id
        AND p.assigned_to = _user_id
        AND p.deleted_at IS NULL
    )
    -- Or is an agency admin
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'admin'
        AND am.status = 'active'
    )
$$;

-- Function to check if a gestionnaire can access an ilot
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_ilot(
  _user_id uuid,
  _owner_id uuid,
  _ilot_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Is the owner
    _user_id = _owner_id
    -- Or has assigned parcelles in this ilot
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.ilot_id = _ilot_id
        AND p.assigned_to = _user_id
        AND p.deleted_at IS NULL
    )
    -- Or is an agency admin
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'admin'
        AND am.status = 'active'
    )
$$;

-- Function to check access to ventes_parcelles via assigned parcelle
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_parcelle(
  _user_id uuid,
  _owner_id uuid,
  _parcelle_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _owner_id
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.id = _parcelle_id
        AND p.assigned_to = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'admin'
        AND am.status = 'active'
    )
$$;

-- Update lotissements SELECT policy
DROP POLICY IF EXISTS "Users can view their own lotissements" ON public.lotissements;

CREATE POLICY "Users can view accessible lotissements"
ON public.lotissements FOR SELECT
USING (
  can_gestionnaire_access_lotissement(auth.uid(), user_id, id)
);

-- Update ilots SELECT policy
DROP POLICY IF EXISTS "Users can view their own ilots" ON public.ilots;

CREATE POLICY "Users can view accessible ilots"
ON public.ilots FOR SELECT
USING (
  can_gestionnaire_access_ilot(auth.uid(), user_id, id)
);

-- Update ventes_parcelles SELECT policy
DROP POLICY IF EXISTS "Users can view their own ventes" ON public.ventes_parcelles;

CREATE POLICY "Users can view accessible ventes_parcelles"
ON public.ventes_parcelles FOR SELECT
USING (
  can_gestionnaire_access_vente_parcelle(auth.uid(), user_id, parcelle_id)
);

-- Update echeances_parcelles SELECT policy (via vente -> parcelle)
DROP POLICY IF EXISTS "Users can view their own echeances" ON public.echeances_parcelles;

CREATE POLICY "Users can view accessible echeances_parcelles"
ON public.echeances_parcelles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.ventes_parcelles vp
    JOIN public.parcelles p ON p.id = vp.parcelle_id
    WHERE vp.id = echeances_parcelles.vente_id
      AND (p.assigned_to = auth.uid() OR EXISTS (
        SELECT 1
        FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = vp.user_id
          AND am.user_id = auth.uid()
          AND am.role = 'admin'
          AND am.status = 'active'
      ))
  )
);

-- Update demarches_administratives SELECT policy
DROP POLICY IF EXISTS "Users can view their own demarches" ON public.demarches_administratives;

CREATE POLICY "Users can view accessible demarches"
ON public.demarches_administratives FOR SELECT
USING (
  auth.uid() = user_id
  OR can_gestionnaire_access_lotissement(auth.uid(), user_id, lotissement_id)
);

-- Update lotissement_documents SELECT policy
DROP POLICY IF EXISTS "Users can view their own lotissement documents" ON public.lotissement_documents;

CREATE POLICY "Users can view accessible lotissement_documents"
ON public.lotissement_documents FOR SELECT
USING (
  auth.uid() = user_id
  OR can_gestionnaire_access_lotissement(auth.uid(), user_id, lotissement_id)
);

-- Update parcelle_prospects SELECT policy (if exists)
DROP POLICY IF EXISTS "Users can view their own prospects" ON public.parcelle_prospects;

CREATE POLICY "Users can view accessible parcelle_prospects"
ON public.parcelle_prospects FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.parcelles p
    WHERE p.id = parcelle_prospects.parcelle_id
      AND (p.assigned_to = auth.uid() OR EXISTS (
        SELECT 1
        FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = p.user_id
          AND am.user_id = auth.uid()
          AND am.role = 'admin'
          AND am.status = 'active'
      ))
  )
);