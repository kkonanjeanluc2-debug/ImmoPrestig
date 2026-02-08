-- Update ilots RLS policy to allow agency owner and admins to see all ilots
DROP POLICY IF EXISTS "Users can view accessible ilots" ON public.ilots;

CREATE POLICY "Users can view accessible ilots" 
ON public.ilots 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM agency_members am 
      WHERE am.agency_id = a.id 
      AND am.user_id = ilots.user_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = ilots.user_id 
    AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ilots.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'
    AND am.status = 'active'
  )
);

-- Update parcelles RLS policy to allow agency owner and admins to see all parcelles
DROP POLICY IF EXISTS "Users can view accessible parcelles" ON public.parcelles;

CREATE POLICY "Users can view accessible parcelles" 
ON public.parcelles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM agency_members am 
      WHERE am.agency_id = a.id 
      AND am.user_id = parcelles.user_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = parcelles.user_id 
    AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'
    AND am.status = 'active'
  )
);

-- Update ventes_parcelles RLS policy
DROP POLICY IF EXISTS "Users can view their own ventes_parcelles" ON public.ventes_parcelles;
DROP POLICY IF EXISTS "Users can view accessible ventes_parcelles" ON public.ventes_parcelles;

CREATE POLICY "Users can view accessible ventes_parcelles" 
ON public.ventes_parcelles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM parcelles p
    WHERE p.id = ventes_parcelles.parcelle_id
    AND (p.assigned_to = auth.uid() OR p.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM agency_members am 
      WHERE am.agency_id = a.id 
      AND am.user_id = ventes_parcelles.user_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.user_id = ventes_parcelles.user_id 
    AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ventes_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'
    AND am.status = 'active'
  )
);