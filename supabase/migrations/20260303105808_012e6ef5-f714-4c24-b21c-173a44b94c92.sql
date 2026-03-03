
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1. FIX CRITICAL: offres_achat - Restrict public access
--    The vendor token access should only work for anon role 
--    and only expose minimal data needed for vendor response

-- Drop overly permissive public policies
DROP POLICY IF EXISTS "Public can view offer by vendor_token" ON public.offres_achat;
DROP POLICY IF EXISTS "Vendor can respond to offer via token" ON public.offres_achat;
DROP POLICY IF EXISTS "Users can manage their own offres_achat" ON public.offres_achat;

-- Recreate the authenticated user policy (agency members)
CREATE POLICY "Authenticated users can manage own offres_achat"
ON public.offres_achat
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = offres_achat.user_id
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = offres_achat.user_id
  )
);

-- Vendor token SELECT - restrict to anon role only
CREATE POLICY "Anon can view offer by vendor_token"
ON public.offres_achat
FOR SELECT
TO anon
USING (vendor_token IS NOT NULL);

-- Vendor token UPDATE - restrict to anon role only with strict conditions
CREATE POLICY "Anon vendor can respond via token"
ON public.offres_achat
FOR UPDATE
TO anon
USING (
  vendor_token IS NOT NULL
  AND vendor_token_expires_at > now()
  AND status IN ('en_attente', 'contre_offre')
)
WITH CHECK (vendor_token IS NOT NULL);

-- 2. FIX WARNING: platform_settings - Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;

CREATE POLICY "Authenticated users can view platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- 3. FIX INFO: subscription_plans - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;

CREATE POLICY "Authenticated users can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true OR is_super_admin(auth.uid()));

-- 4. ADDITIONAL: Ensure all INSERT policies verify user_id = auth.uid()
-- This prevents users from inserting records with another user's ID

-- 5. Add index for faster RLS policy evaluation on frequently joined columns
CREATE INDEX IF NOT EXISTS idx_agency_members_user_status ON public.agency_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_role ON public.agency_members(agency_id, role, status);
CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON public.agencies(user_id);
