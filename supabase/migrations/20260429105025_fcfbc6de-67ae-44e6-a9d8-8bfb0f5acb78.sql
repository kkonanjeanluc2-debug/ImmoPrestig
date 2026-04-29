-- Harmonize RLS policies for apporteurs_affaires & apports to include
-- admin, comptable, caissiere agency members + allow team to manage on
-- behalf of agency owner.

-- ============ apporteurs_affaires ============
DROP POLICY IF EXISTS "Users can view own apporteurs" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Users can create apporteurs" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Users can update own apporteurs" ON public.apporteurs_affaires;
DROP POLICY IF EXISTS "Users can delete own apporteurs" ON public.apporteurs_affaires;

CREATE POLICY "View apporteurs in agency"
ON public.apporteurs_affaires FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role, 'gestionnaire'::app_role])
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = apporteurs_affaires.user_id
  )
);

CREATE POLICY "Create apporteurs in agency"
ON public.apporteurs_affaires FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
);

CREATE POLICY "Update apporteurs in agency"
ON public.apporteurs_affaires FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
);

CREATE POLICY "Delete apporteurs in agency"
ON public.apporteurs_affaires FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role])
);

-- ============ apports ============
DROP POLICY IF EXISTS "Users can view own apports" ON public.apports;
DROP POLICY IF EXISTS "Users can create apports" ON public.apports;
DROP POLICY IF EXISTS "Users can update own apports" ON public.apports;
DROP POLICY IF EXISTS "Users can delete own apports" ON public.apports;

CREATE POLICY "View apports in agency"
ON public.apports FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role, 'gestionnaire'::app_role])
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid() AND am.user_id = apports.user_id
  )
);

CREATE POLICY "Create apports in agency"
ON public.apports FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
);

CREATE POLICY "Update apports in agency"
ON public.apports FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role, 'caissiere'::app_role])
);

CREATE POLICY "Delete apports in agency"
ON public.apports FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_agency_role_access_to_user(auth.uid(), user_id, ARRAY['admin'::app_role, 'comptable'::app_role])
);