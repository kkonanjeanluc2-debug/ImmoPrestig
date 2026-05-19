REVOKE EXECUTE ON FUNCTION public.can_view_parcelle_for_own_sale(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_vente_parcelle_safe(uuid, uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_parcelle_for_own_sale(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_vente_parcelle_safe(uuid, uuid, uuid, uuid) TO authenticated;