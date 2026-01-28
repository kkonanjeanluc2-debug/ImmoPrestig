-- Add assigned_to column to parcelles for manager assignment
ALTER TABLE public.parcelles ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Add sold_by column to ventes_parcelles to track who made the sale
ALTER TABLE public.ventes_parcelles ADD COLUMN IF NOT EXISTS sold_by uuid;

-- Add payment_method column to ventes_parcelles for transaction-level payment method tracking
ALTER TABLE public.ventes_parcelles ADD COLUMN IF NOT EXISTS payment_method text;

-- Create function to check if user can access parcelle (similar to properties)
CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the parcelle owner (agency owner)
    _user_id = _parcelle_user_id
    OR
    -- User is assigned to this parcelle
    _user_id = _assigned_to
    OR
    -- User is admin/owner of the agency that owns this parcelle
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    -- User is a gestionnaire with no specific assignment (can see unassigned)
    (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$$;

-- Update RLS policy for parcelles to use access function
DROP POLICY IF EXISTS "Users can view their own parcelles" ON public.parcelles;
CREATE POLICY "Users can view accessible parcelles"
ON public.parcelles FOR SELECT
USING (can_access_parcelle(auth.uid(), user_id, assigned_to));

-- Allow agency owners and admins to update parcelles (for assignment)
DROP POLICY IF EXISTS "Users can update their own parcelles" ON public.parcelles;
CREATE POLICY "Agency owners and admins can update parcelles"
ON public.parcelles FOR UPDATE
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  ))
);

-- Create function to check ventes_parcelles access
CREATE OR REPLACE FUNCTION public.can_access_vente_parcelle(_user_id uuid, _vente_user_id uuid, _sold_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _vente_user_id
    OR _user_id = _sold_by
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR (
      _sold_by IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$$;

-- Update RLS policy for ventes_parcelles
DROP POLICY IF EXISTS "Users can view their own ventes" ON public.ventes_parcelles;
CREATE POLICY "Users can view accessible ventes"
ON public.ventes_parcelles FOR SELECT
USING (can_access_vente_parcelle(auth.uid(), user_id, sold_by));