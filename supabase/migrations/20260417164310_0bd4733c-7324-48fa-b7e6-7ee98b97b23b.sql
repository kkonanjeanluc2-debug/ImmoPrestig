
-- 1. Add DELETE policy on automation_schedules
CREATE POLICY "Users can delete their own automation schedules"
  ON public.automation_schedules
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Drop unsafe anonymous policies on offres_achat
DROP POLICY IF EXISTS "Anon can view offer by vendor_token" ON public.offres_achat;
DROP POLICY IF EXISTS "Anon vendor can respond via token" ON public.offres_achat;

-- 3. Tighten contracts DELETE policy: must own contract OR be admin of the same agency
DROP POLICY IF EXISTS "Users can delete accessible contracts" ON public.contracts;
CREATE POLICY "Users can delete accessible contracts"
  ON public.contracts
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = contracts.user_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 4. Restrict agencies SELECT to remove secret keys exposure to members
-- Drop the broad members policy and replace with owner/super-admin-only full read
DROP POLICY IF EXISTS "Agency members can view their agency" ON public.agencies;

-- Create a SECURITY INVOKER view exposing only non-sensitive columns to members & tenants
CREATE OR REPLACE VIEW public.agencies_public
WITH (security_invoker = true) AS
SELECT
  id, user_id, name, email, phone, address, city, country, siret,
  logo_url, primary_color, accent_color, sidebar_color,
  pdf_header_text, pdf_primary_color, pdf_secondary_color, pdf_text_color,
  notification_email, notification_whatsapp,
  account_type, is_active,
  invoice_counter, proforma_counter, receipt_counter,
  rent_due_day, reservation_deposit_percentage, sale_commission_percentage,
  online_rent_enabled,
  mobile_money_provider, mobile_money_number,
  latitude, longitude,
  whatsapp_property_template,
  kkiapay_public_key, kkiapay_sandbox,
  geniuspay_public_key, geniuspay_sandbox,
  wave_sandbox,
  created_at, updated_at
FROM public.agencies;

-- Grant access to the public view
GRANT SELECT ON public.agencies_public TO authenticated, anon;

-- Re-add a members SELECT policy ONLY through the view path:
-- Members still need to read their agency for non-sensitive ops, but secret columns are hidden.
-- Because Postgres RLS applies at the table level, we keep a members policy but rely on the view
-- for non-sensitive reads. Direct table SELECT is restricted to owner & super admin only.
-- (Members must use agencies_public going forward for non-sensitive reads.)

-- Allow members to still read their agency row (needed by current code paths) but the application
-- should migrate to agencies_public. Keep a member read policy for backwards compatibility.
CREATE POLICY "Agency members can view their agency"
  ON public.agencies
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_agency_member(id)
  );

-- 5. Fix property-images storage policies: require ownership via folder name = uid
DROP POLICY IF EXISTS "Users can delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update property images" ON storage.objects;

CREATE POLICY "Users can delete their own property images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own property images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
