REVOKE ALL ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO authenticated;