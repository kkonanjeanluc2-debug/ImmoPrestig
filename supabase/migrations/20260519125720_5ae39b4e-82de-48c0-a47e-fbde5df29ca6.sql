REVOKE ALL ON FUNCTION public.can_view_parcelle_for_own_sale(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_vente_parcelle_safe(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_parcelle_for_own_sale(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_vente_parcelle_safe(uuid, uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Commercials can view parcelles for their own sales" ON public.parcelles;
CREATE POLICY "Commercials can view parcelles for their own sales"
ON public.parcelles
FOR SELECT
TO authenticated
USING (public.can_view_parcelle_for_own_sale(auth.uid(), id, user_id));

DROP POLICY IF EXISTS "Users can view accessible ventes_parcelles" ON public.ventes_parcelles;
CREATE POLICY "Users can view accessible ventes_parcelles"
ON public.ventes_parcelles
FOR SELECT
TO authenticated
USING (public.can_access_vente_parcelle_safe(auth.uid(), user_id, sold_by, parcelle_id));