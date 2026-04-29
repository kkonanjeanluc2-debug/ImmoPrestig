GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO authenticated;