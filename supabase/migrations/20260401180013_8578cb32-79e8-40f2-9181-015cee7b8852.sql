
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_lotissement(_user_id uuid, _owner_id uuid, _lotissement_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.lotissement_id = _lotissement_id
        AND bl.member_user_id = _user_id
        AND p.deleted_at IS NULL
    )
    -- Caissière can access lotissements
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    -- Gestionnaires can see lotissements that have disponible parcelles
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
