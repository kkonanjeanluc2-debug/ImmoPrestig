-- Add 'locataire' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'locataire';

-- Add user_id column to tenants table for linking to auth.users
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add has_portal_access column to track if tenant can log in
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS has_portal_access boolean NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id) WHERE user_id IS NOT NULL;

-- Create a function to get tenant count with portal access for an agency
CREATE OR REPLACE FUNCTION public.get_agency_tenant_portal_count(p_agency_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.tenants t
  JOIN public.agencies a ON a.user_id = t.user_id OR EXISTS (
    SELECT 1 FROM public.agency_members am 
    WHERE am.agency_id = a.id 
    AND am.user_id = t.user_id
    AND am.status = 'active'
  )
  WHERE a.id = p_agency_id
  AND t.has_portal_access = true
  AND t.deleted_at IS NULL
$$;

-- Update function to check if agency can add tenant portal access
CREATE OR REPLACE FUNCTION public.can_agency_add_tenant_portal(p_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT 
        CASE 
          WHEN sp.max_tenants IS NULL THEN TRUE
          ELSE (
            SELECT COUNT(*)::INTEGER 
            FROM public.tenants t
            WHERE t.user_id IN (
              SELECT a.user_id FROM public.agencies a WHERE a.id = p_agency_id
              UNION
              SELECT am.user_id FROM public.agency_members am WHERE am.agency_id = p_agency_id AND am.status = 'active'
            )
            AND t.has_portal_access = true
            AND t.deleted_at IS NULL
          ) < sp.max_tenants
        END
      FROM public.agency_subscriptions ags
      JOIN public.subscription_plans sp ON sp.id = ags.plan_id
      WHERE ags.agency_id = p_agency_id
      AND ags.status = 'active'
      LIMIT 1
    ),
    TRUE
  )
$$;

-- RLS policy for tenants to view their own data
CREATE POLICY "Tenants can view their own tenant record"
ON public.tenants
FOR SELECT
USING (
  auth.uid() = user_id
);

-- RLS policy for tenants to view their own payments
CREATE POLICY "Tenants can view their own payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = payments.tenant_id
    AND t.user_id = auth.uid()
  )
);

-- RLS policy for tenants to view their own contracts
CREATE POLICY "Tenants can view their own contracts"
ON public.contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = contracts.tenant_id
    AND t.user_id = auth.uid()
  )
);

-- RLS policy for tenants to view their own etats des lieux
CREATE POLICY "Tenants can view their own etats_des_lieux"
ON public.etats_des_lieux
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = etats_des_lieux.tenant_id
    AND t.user_id = auth.uid()
  )
);

-- RLS policy for tenants to view their own documents
CREATE POLICY "Tenants can view their own documents"
ON public.documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = documents.tenant_id
    AND t.user_id = auth.uid()
  )
);