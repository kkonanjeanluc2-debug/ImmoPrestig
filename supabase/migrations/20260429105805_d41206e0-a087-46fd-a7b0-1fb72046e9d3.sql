CREATE OR REPLACE FUNCTION public.has_member_permission_for_user(
  _actor_user_id uuid,
  _target_user_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO authenticated;