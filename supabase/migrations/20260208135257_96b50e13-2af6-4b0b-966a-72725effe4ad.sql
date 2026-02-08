-- Drop existing complex policies that cause timeouts
DROP POLICY IF EXISTS "Users can view accessible ventes_immobilieres" ON public.ventes_immobilieres;
DROP POLICY IF EXISTS "Users can view accessible echeances_ventes" ON public.echeances_ventes;
DROP POLICY IF EXISTS "Users can view accessible reservations_vente" ON public.reservations_vente;

-- Recreate simpler SELECT policies using existing security definer functions
CREATE POLICY "Users can view accessible ventes_immobilieres" 
ON public.ventes_immobilieres FOR SELECT 
USING (
  can_gestionnaire_access_vente_immo(auth.uid(), user_id, bien_id)
);

CREATE POLICY "Users can view accessible echeances_ventes" 
ON public.echeances_ventes FOR SELECT 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ventes_immobilieres vi
    WHERE vi.id = echeances_ventes.vente_id
    AND can_gestionnaire_access_vente_immo(auth.uid(), vi.user_id, vi.bien_id)
  )
);

CREATE POLICY "Users can view accessible reservations_vente" 
ON public.reservations_vente FOR SELECT 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM biens_vente bv
    WHERE bv.id = reservations_vente.bien_id
    AND can_gestionnaire_access_bien_vente(auth.uid(), bv.user_id, bv.assigned_to)
  )
);

-- Add UPDATE policy for biens_vente so admins can soft-delete (update deleted_at)
DROP POLICY IF EXISTS "Agency owners and admins can update biens_vente" ON public.biens_vente;
CREATE POLICY "Agency owners and admins can update biens_vente" 
ON public.biens_vente FOR UPDATE 
USING (
  auth.uid() = user_id
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id
    WHERE a.user_id = biens_vente.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);