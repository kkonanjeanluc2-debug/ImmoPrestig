
-- Update can_access_parcelle to also check beneficiaires_lots.member_user_id
CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _parcelle_user_id
    OR _user_id = _assigned_to
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    -- Team member can see parcelle if they are a beneficiaire with member_user_id
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.member_user_id = _user_id
      AND p.user_id = _parcelle_user_id
    )
$function$;

-- Update can_gestionnaire_access_lotissement to also check beneficiaires_lots
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_lotissement(_user_id uuid, _owner_id uuid, _lotissement_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _owner_id
    OR EXISTS (
      SELECT 1 FROM public.parcelles p
      WHERE p.lotissement_id = _lotissement_id
        AND p.assigned_to = _user_id
        AND p.deleted_at IS NULL
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
    -- Team member is a beneficiaire with assigned lots in this lotissement
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.lotissement_id = _lotissement_id
        AND bl.member_user_id = _user_id
        AND p.deleted_at IS NULL
    )
$function$;
