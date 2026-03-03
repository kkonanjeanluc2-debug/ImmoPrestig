-- Function to get agency payment config from any agency user_id (owner or member)
-- Tenants need this to display the "Payer" button
CREATE OR REPLACE FUNCTION public.get_agency_payment_config(_agency_user_id uuid)
RETURNS TABLE(kkiapay_public_key text, online_rent_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Try direct ownership first
  SELECT a.kkiapay_public_key, a.online_rent_enabled
  FROM public.agencies a
  WHERE a.user_id = _agency_user_id
  UNION ALL
  -- Then try membership
  SELECT a.kkiapay_public_key, a.online_rent_enabled
  FROM public.agency_members am
  JOIN public.agencies a ON a.id = am.agency_id
  WHERE am.user_id = _agency_user_id
    AND am.status = 'active'
  LIMIT 1
$$;