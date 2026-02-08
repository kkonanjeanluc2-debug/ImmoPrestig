-- Allow gestionnaires to view property units for properties assigned to them
CREATE POLICY "Gestionnaires can view units of assigned properties"
ON public.property_units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_units.property_id
    AND p.assigned_to = auth.uid()
  )
);

-- Allow gestionnaires to update property units for properties assigned to them
CREATE POLICY "Gestionnaires can update units of assigned properties"
ON public.property_units FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_units.property_id
    AND p.assigned_to = auth.uid()
  )
);

-- Allow agency members (admin) to view all property units in their agency
CREATE POLICY "Agency admins can view all units"
ON public.property_units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = property_units.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Allow agency admins to update property units
CREATE POLICY "Agency admins can update all units"
ON public.property_units FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = property_units.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);