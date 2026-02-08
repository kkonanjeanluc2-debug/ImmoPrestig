-- Add assigned_to column to ilots table for manager assignment
ALTER TABLE public.ilots 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add assigned_to column to parcelle_prospects table for manager assignment
ALTER TABLE public.parcelle_prospects 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ilots_assigned_to ON public.ilots(assigned_to);
CREATE INDEX IF NOT EXISTS idx_parcelle_prospects_assigned_to ON public.parcelle_prospects(assigned_to);

-- Update RLS policy for ilots to allow gestionnaires to view their assigned ilots
DROP POLICY IF EXISTS "Users can view accessible ilots" ON public.ilots;
CREATE POLICY "Users can view accessible ilots" ON public.ilots
FOR SELECT USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR can_gestionnaire_access_lotissement(auth.uid(), user_id, lotissement_id)
);

-- Update RLS policy for parcelle_prospects
DROP POLICY IF EXISTS "Users can view accessible parcelle_prospects" ON public.parcelle_prospects;
CREATE POLICY "Users can view accessible parcelle_prospects" ON public.parcelle_prospects
FOR SELECT USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM parcelles p 
    WHERE p.id = parcelle_prospects.parcelle_id 
    AND p.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelle_prospects.user_id 
    AND am.user_id = auth.uid() 
    AND am.role = 'admin' 
    AND am.status = 'active'
  )
);

-- Allow gestionnaires to update their assigned ilots
DROP POLICY IF EXISTS "Gestionnaires can update assigned ilots" ON public.ilots;
CREATE POLICY "Gestionnaires can update assigned ilots" ON public.ilots
FOR UPDATE USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ilots.user_id 
    AND am.user_id = auth.uid() 
    AND am.role = 'admin' 
    AND am.status = 'active'
  )
);

-- Allow gestionnaires to update their assigned prospects
DROP POLICY IF EXISTS "Gestionnaires can update assigned prospects" ON public.parcelle_prospects;
CREATE POLICY "Gestionnaires can update assigned prospects" ON public.parcelle_prospects
FOR UPDATE USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = parcelle_prospects.user_id 
    AND am.user_id = auth.uid() 
    AND am.role = 'admin' 
    AND am.status = 'active'
  )
);