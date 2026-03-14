-- Strict manager visibility for sales assets:
-- gestionnaire => only assigned_to
-- admins/agency owners => broad access

CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_vente(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    -- Always allow the assigned user
    _user_id = _assigned_to

    -- Agency owner can see members' records
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _bien_user_id
    )

    -- Admin member can see records of their agency
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )

    -- Creator can only see if they are admin/super_admin (not plain gestionnaire)
    OR (
      _user_id = _bien_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )

    -- Global super admin
    OR public.is_super_admin(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_immo(_user_id uuid, _vente_user_id uuid, _bien_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    -- Access inherited from bien assignment/admin structure
    EXISTS (
      SELECT 1
      FROM public.biens_vente bv
      WHERE bv.id = _bien_id
        AND public.can_gestionnaire_access_bien_vente(_user_id, bv.user_id, bv.assigned_to)
    )

    -- Creator can only see if they are admin/super_admin
    OR (
      _user_id = _vente_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )

    -- Agency owner of the sale creator
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _vente_user_id
    )

    -- Admin member in sale creator agency
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )

    OR public.is_super_admin(_user_id)
$function$;