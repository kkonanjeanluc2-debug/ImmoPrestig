
CREATE OR REPLACE FUNCTION public.has_member_permission_for_user(_actor_user_id uuid, _target_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_super_admin(_actor_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      WHERE a.user_id = _actor_user_id
        AND (
          a.user_id = _target_user_id
          OR EXISTS (
            SELECT 1
            FROM public.agency_members target
            WHERE target.agency_id = a.id
              AND target.user_id = _target_user_id
              AND target.status = 'active'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.agency_members actor
      JOIN public.agencies a ON a.id = actor.agency_id
      WHERE actor.user_id = _actor_user_id
        AND actor.role = 'admin'::app_role
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
    OR EXISTS (
      SELECT 1
      FROM public.agency_members actor
      JOIN public.agencies a ON a.id = actor.agency_id
      JOIN public.member_permissions mp ON mp.member_id = actor.id
      WHERE actor.user_id = _actor_user_id
        AND actor.status = 'active'
        AND actor.role <> 'admin'::app_role
        AND (
          a.user_id = _target_user_id
          OR actor.user_id = _target_user_id
          OR EXISTS (
            SELECT 1
            FROM public.agency_members target
            WHERE target.agency_id = actor.agency_id
              AND target.user_id = _target_user_id
              AND target.status = 'active'
          )
        )
        AND CASE _permission
          WHEN 'can_view_apporteurs' THEN mp.can_view_apporteurs
          WHEN 'can_create_apporteurs' THEN mp.can_create_apporteurs
          WHEN 'can_edit_apporteurs' THEN mp.can_edit_apporteurs
          WHEN 'can_delete_apporteurs' THEN mp.can_delete_apporteurs
          WHEN 'can_create_lotissements' THEN mp.can_create_lotissements
          WHEN 'can_edit_lotissements' THEN mp.can_edit_lotissements
          WHEN 'can_delete_lotissements' THEN mp.can_delete_lotissements
          WHEN 'can_create_ilots' THEN mp.can_create_ilots
          WHEN 'can_create_parcelles' THEN mp.can_create_parcelles
          WHEN 'can_view_ventes' THEN mp.can_view_ventes
          WHEN 'can_create_ventes' THEN mp.can_create_ventes
          WHEN 'can_edit_ventes' THEN mp.can_edit_ventes
          WHEN 'can_delete_ventes' THEN mp.can_delete_ventes
          ELSE false
        END
    )
    OR (
      _actor_user_id = _target_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.agency_members actor
        WHERE actor.user_id = _actor_user_id
          AND actor.status = 'active'
      )
    )
$function$;

-- Allow agency members with can_view_ventes to see all sales of their agency
CREATE POLICY "Members with view ventes can read"
ON public.ventes_immobilieres FOR SELECT
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_view_ventes'));

-- Also expose related biens_vente and acquereurs to those members so the list resolves details
CREATE POLICY "Members with view ventes can read biens"
ON public.biens_vente FOR SELECT
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_view_ventes'));

CREATE POLICY "Members with view ventes can read acquereurs"
ON public.acquereurs FOR SELECT
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_view_ventes'));

-- Update / delete policies aligned with granular perms
CREATE POLICY "Members with edit ventes can update"
ON public.ventes_immobilieres FOR UPDATE
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_edit_ventes'));

CREATE POLICY "Members with delete ventes can delete"
ON public.ventes_immobilieres FOR DELETE
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_delete_ventes'));
