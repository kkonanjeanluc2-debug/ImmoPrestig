
-- Fix: Tenants created by gestionnaires should also see the agency
DROP POLICY IF EXISTS "Tenants can view their agency" ON public.agencies;
CREATE POLICY "Tenants can view their agency"
ON public.agencies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.portal_user_id = auth.uid()
      AND t.has_portal_access = true
      AND (
        t.user_id = agencies.user_id
        OR EXISTS (
          SELECT 1 FROM agency_members am
          WHERE am.agency_id = agencies.id
            AND am.user_id = t.user_id
            AND am.status = 'active'
        )
      )
  )
);
