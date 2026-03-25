-- Update can_access_property to allow caissière members to see all agency properties
CREATE OR REPLACE FUNCTION public.can_access_property(_user_id uuid, _property_user_id uuid, _assigned_to uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _assigned_to
    OR
    (
      _user_id = _property_user_id
      AND (
        _assigned_to IS NULL
        OR _assigned_to = _user_id
        OR public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
        OR EXISTS (
          SELECT 1 FROM public.agencies a WHERE a.user_id = _user_id
        )
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _property_user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
        AND am1.role = 'admin'::app_role
        AND am1.status = 'active'
        AND am2.user_id = _property_user_id
    )
    OR
    (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _property_user_id
          AND am.user_id = _user_id
          AND am.status = 'active'
      )
    )
    OR
    -- Caissière can see ALL properties in their agency
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    OR
    -- Caissière seeing properties created by other team members
    EXISTS (
      SELECT 1 FROM public.agency_members am_caissiere
      JOIN public.agency_members am_creator ON am_caissiere.agency_id = am_creator.agency_id
      WHERE am_caissiere.user_id = _user_id
        AND am_caissiere.role = 'caissiere'::app_role
        AND am_caissiere.status = 'active'
        AND am_creator.user_id = _property_user_id
    )
$function$;

-- Update can_access_tenant_v2 to allow caissière
CREATE OR REPLACE FUNCTION public.can_access_tenant_v2(_user_id uuid, _tenant_user_id uuid, _assigned_to uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _user_id = _tenant_user_id
    OR 
    _user_id = _assigned_to
    OR 
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _tenant_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
      AND am.user_id = _tenant_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agency_members am1
      JOIN public.agency_members am2 ON am1.agency_id = am2.agency_id
      WHERE am1.user_id = _user_id
      AND am1.role = 'admin'::app_role
      AND am1.status = 'active'
      AND am2.user_id = _tenant_user_id
    )
    OR 
    (
      _property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        JOIN public.agencies a ON a.user_id IN (
          SELECT a2.user_id FROM public.agencies a2
          JOIN public.agency_members am ON am.agency_id = a2.id
          WHERE am.user_id = _tenant_user_id AND am.status = 'active'
          UNION
          SELECT _tenant_user_id
        )
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE p.id = _property_id
        AND p.assigned_to = _user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
    OR
    -- Caissière can see ALL tenants in their agency (owner's tenants)
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _tenant_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
    OR
    -- Caissière seeing tenants created by other team members
    EXISTS (
      SELECT 1 FROM public.agency_members am_caissiere
      JOIN public.agency_members am_creator ON am_caissiere.agency_id = am_creator.agency_id
      WHERE am_caissiere.user_id = _user_id
        AND am_caissiere.role = 'caissiere'::app_role
        AND am_caissiere.status = 'active'
        AND am_creator.user_id = _tenant_user_id
    )
$function$;

-- Update can_gestionnaire_access_bien_vente for caissière
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_bien_vente(_user_id uuid, _bien_user_id uuid, _assigned_to uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _user_id = _assigned_to
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _bien_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR (
      _user_id = _bien_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )
    OR public.is_super_admin(_user_id)
    -- Caissière can see all biens vente in agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _bien_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_gestionnaire_access_lotissement for caissière
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
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.lotissement_id = _lotissement_id
        AND bl.member_user_id = _user_id
        AND p.deleted_at IS NULL
    )
    -- Caissière can access lotissements for parcelle sales
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_access_parcelle (4 params) for caissière
CREATE OR REPLACE FUNCTION public.can_access_parcelle(_user_id uuid, _parcelle_user_id uuid, _assigned_to uuid, _beneficiaire_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _user_id = _parcelle_user_id
    OR _user_id = _assigned_to
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.beneficiaires_lots bl
      WHERE bl.id = _beneficiaire_id
        AND bl.member_user_id = _user_id
        AND bl.user_id = _parcelle_user_id
    )
    -- Caissière can access all parcelles in agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_access_parcelle (3 params) for caissière
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
    OR EXISTS (
      SELECT 1 FROM public.beneficiaires_lots bl
      JOIN public.parcelles p ON p.beneficiaire_id = bl.id
      WHERE bl.member_user_id = _user_id
      AND p.user_id = _parcelle_user_id
    )
    -- Caissière can access all parcelles in agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _parcelle_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_gestionnaire_access_vente_parcelle for caissière
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_parcelle(_user_id uuid, _owner_id uuid, _parcelle_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Caissière can access vente parcelles
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _owner_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_gestionnaire_access_vente_immo for caissière
CREATE OR REPLACE FUNCTION public.can_gestionnaire_access_vente_immo(_user_id uuid, _vente_user_id uuid, _bien_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.biens_vente bv
      WHERE bv.id = _bien_id
        AND public.can_gestionnaire_access_bien_vente(_user_id, bv.user_id, bv.assigned_to)
    )
    OR (
      _user_id = _vente_user_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR public.is_super_admin(_user_id)
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _user_id
        AND am.user_id = _vente_user_id
    )
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
    -- Caissière can access ventes immobilières
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;

-- Update can_access_vente_parcelle for caissière
CREATE OR REPLACE FUNCTION public.can_access_vente_parcelle(_user_id uuid, _vente_user_id uuid, _sold_by uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Caissière can access all ventes parcelles in agency
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _vente_user_id
        AND am.user_id = _user_id
        AND am.role = 'caissiere'::app_role
        AND am.status = 'active'
    )
$function$;