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
    _actor_user_id = _target_user_id
    OR public.is_super_admin(_actor_user_id)
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
$$;

REVOKE ALL ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO authenticated;

DROP POLICY IF EXISTS "View apporteurs in agency" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Create apporteurs in agency" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Update apporteurs in agency" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Delete apporteurs in agency" ON public.apporteurs_affaires;

CREATE POLICY "View apporteurs by permission"
ON public.apporteurs_affaires FOR SELECT
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_view_apporteurs'));

CREATE POLICY "Create apporteurs by permission"
ON public.apporteurs_affaires FOR INSERT
TO authenticated
WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, 'can_create_apporteurs'));

CREATE POLICY "Update apporteurs by permission"
ON public.apporteurs_affaires FOR UPDATE
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_edit_apporteurs'))
WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, 'can_edit_apporteurs'));

CREATE POLICY "Delete apporteurs by permission"
ON public.apporteurs_affaires FOR DELETE
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_delete_apporteurs'));

DROP POLICY IF EXISTS "View apports in agency" ON public.apports;
DROP POLICY IF EXISTS "Create apports in agency" ON public.apports;
DROP POLICY IF EXISTS "Update apports in agency" ON public.apports;
DROP POLICY IF EXISTS "Delete apports in agency" ON public.apports;

CREATE POLICY "View apports by permission"
ON public.apports FOR SELECT
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_view_apporteurs'));

CREATE POLICY "Create apports by permission"
ON public.apports FOR INSERT
TO authenticated
WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, 'can_create_apporteurs'));

CREATE POLICY "Update apports by permission"
ON public.apports FOR UPDATE
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_edit_apporteurs'))
WITH CHECK (public.has_member_permission_for_user(auth.uid(), user_id, 'can_edit_apporteurs'));

CREATE POLICY "Delete apports by permission"
ON public.apports FOR DELETE
TO authenticated
USING (public.has_member_permission_for_user(auth.uid(), user_id, 'can_delete_apporteurs'));