-- Update the can_access_parcelle function to be more restrictive for gestionnaires
-- Gestionnaires should ONLY see parcelles assigned to them, not all unassigned ones
CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
    -- REMOVED: gestionnaires no longer see unassigned parcelles
$$;