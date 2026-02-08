-- Function to check if a gestionnaire can access a bien_vente
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_vente(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the owner (agency owner)
    _user_id = _bien_user_id
    OR
    -- User is assigned to this bien
    _user_id = _assigned_to
    OR
    -- User is admin of the agency
    EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
$$;

-- Update the biens_vente SELECT policy to be more restrictive for gestionnaires
DROP POLICY IF EXISTS "Users can view accessible biens_vente" ON public.biens_vente;

CREATE POLICY "Users can view accessible biens_vente"
ON public.biens_vente FOR SELECT
USING (can_gestionnaire_access_bien_vente(auth.uid(), user_id, assigned_to));

-- Function to check if a gestionnaire can access a vente_immobiliere based on bien assignment
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_immo(_user_id uuid, _vente_user_id uuid, _bien_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the owner
    _user_id = _vente_user_id
    OR
    -- User is admin of the agency
    EXISTS (
      SELECT 1 FROM agencies a
      JOIN agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    -- User is the gestionnaire assigned to the bien
    EXISTS (
      SELECT 1 FROM biens_vente bv
      WHERE bv.id = _bien_id
      AND bv.assigned_to = _user_id
    )
$$;

-- Update ventes_immobilieres SELECT policy
DROP POLICY IF EXISTS "Users can view accessible ventes_immobilieres" ON public.ventes_immobilieres;

CREATE POLICY "Users can view accessible ventes_immobilieres"
ON public.ventes_immobilieres FOR SELECT
USING (can_gestionnaire_access_vente_immo(auth.uid(), user_id, bien_id));

-- Add policy for echeances_ventes to allow gestionnaires to see echéances of their assigned biens
DROP POLICY IF EXISTS "Users can view their own echeances_ventes" ON public.echeances_ventes;

CREATE POLICY "Users can view accessible echeances_ventes"
ON public.echeances_ventes FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.id = echeances_ventes.vente_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN agencies a ON a.user_id = vi.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE vi.id = echeances_ventes.vente_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Add policy for vente_prospects to allow gestionnaires to see prospects of their assigned biens
DROP POLICY IF EXISTS "Users can view their own vente prospects" ON public.vente_prospects;

CREATE POLICY "Users can view accessible vente prospects"
ON public.vente_prospects FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = vente_prospects.bien_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    JOIN agencies a ON a.user_id = bv.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = vente_prospects.bien_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Add policy for acquereurs to allow gestionnaires to see acquéreurs linked to their assigned biens
DROP POLICY IF EXISTS "Users can view their own acquereurs" ON public.acquereurs;

CREATE POLICY "Users can view accessible acquereurs"
ON public.acquereurs FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.acquereur_id = acquereurs.id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN agencies a ON a.user_id = vi.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE vi.acquereur_id = acquereurs.id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Add policy for reservations_vente to allow gestionnaires to see reservations of their assigned biens
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations_vente;

CREATE POLICY "Users can view accessible reservations"
ON public.reservations_vente FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = reservations_vente.bien_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    JOIN agencies a ON a.user_id = bv.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = reservations_vente.bien_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Add policy for biens_vente_images to allow gestionnaires to see images of their assigned biens
DROP POLICY IF EXISTS "Users can view their own bien images" ON public.biens_vente_images;

CREATE POLICY "Users can view accessible bien images"
ON public.biens_vente_images FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = biens_vente_images.bien_id
    AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    JOIN agencies a ON a.user_id = bv.user_id
    JOIN agency_members am ON am.agency_id = a.id
    WHERE bv.id = biens_vente_images.bien_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);