-- Update RLS policies for ventes immobilieres related tables
-- First drop existing policies, then recreate them

-- 1. Update biens_vente SELECT policy
DROP POLICY IF EXISTS "Users can view accessible biens_vente" ON public.biens_vente;

CREATE POLICY "Users can view accessible biens_vente" 
ON public.biens_vente 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    LEFT JOIN agency_members am ON am.agency_id = a.id
    WHERE (
      a.user_id = auth.uid() 
      OR (am.user_id = auth.uid() AND am.role = 'admin' AND am.status = 'active')
    )
    AND (
      a.user_id = biens_vente.user_id 
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id AND am2.user_id = biens_vente.user_id AND am2.status = 'active'
      )
    )
  )
);

-- 2. Update ventes_immobilieres SELECT policy
DROP POLICY IF EXISTS "Users can view accessible ventes_immobilieres" ON public.ventes_immobilieres;
DROP POLICY IF EXISTS "Users can view their own ventes immobilieres" ON public.ventes_immobilieres;

CREATE POLICY "Users can view accessible ventes_immobilieres" 
ON public.ventes_immobilieres 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = sold_by
  OR EXISTS (
    SELECT 1 FROM biens_vente bv 
    WHERE bv.id = ventes_immobilieres.bien_id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    LEFT JOIN agency_members am ON am.agency_id = a.id
    WHERE (
      a.user_id = auth.uid() 
      OR (am.user_id = auth.uid() AND am.role = 'admin' AND am.status = 'active')
    )
    AND (
      a.user_id = ventes_immobilieres.user_id 
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id AND am2.user_id = ventes_immobilieres.user_id AND am2.status = 'active'
      )
    )
  )
);

-- 3. Update echeances_ventes SELECT policy
DROP POLICY IF EXISTS "Users can view accessible echeances_ventes" ON public.echeances_ventes;
DROP POLICY IF EXISTS "Users can view their own echeances ventes" ON public.echeances_ventes;

CREATE POLICY "Users can view accessible echeances_ventes" 
ON public.echeances_ventes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    JOIN biens_vente bv ON bv.id = vi.bien_id
    WHERE vi.id = echeances_ventes.vente_id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    LEFT JOIN agency_members am ON am.agency_id = a.id
    WHERE (
      a.user_id = auth.uid() 
      OR (am.user_id = auth.uid() AND am.role = 'admin' AND am.status = 'active')
    )
    AND (
      a.user_id = echeances_ventes.user_id 
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id AND am2.user_id = echeances_ventes.user_id AND am2.status = 'active'
      )
    )
  )
);

-- 4. Update reservations_vente SELECT policy
DROP POLICY IF EXISTS "Users can view accessible reservations_vente" ON public.reservations_vente;
DROP POLICY IF EXISTS "Users can view their own reservations vente" ON public.reservations_vente;

CREATE POLICY "Users can view accessible reservations_vente" 
ON public.reservations_vente 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM biens_vente bv 
    WHERE bv.id = reservations_vente.bien_id AND bv.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agencies a
    LEFT JOIN agency_members am ON am.agency_id = a.id
    WHERE (
      a.user_id = auth.uid() 
      OR (am.user_id = auth.uid() AND am.role = 'admin' AND am.status = 'active')
    )
    AND (
      a.user_id = reservations_vente.user_id 
      OR EXISTS (
        SELECT 1 FROM agency_members am2
        WHERE am2.agency_id = a.id AND am2.user_id = reservations_vente.user_id AND am2.status = 'active'
      )
    )
  )
);