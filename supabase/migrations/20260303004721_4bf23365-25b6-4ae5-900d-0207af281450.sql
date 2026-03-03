
-- =============================================
-- FIX: acquisitions - add agency-level access
-- =============================================
DROP POLICY IF EXISTS "Users can view their own acquisitions" ON public.acquisitions;
DROP POLICY IF EXISTS "Users can update their own acquisitions" ON public.acquisitions;
DROP POLICY IF EXISTS "Users can delete their own acquisitions" ON public.acquisitions;

CREATE POLICY "Users can view accessible acquisitions" ON public.acquisitions
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquisitions.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = acquisitions.user_id
    AND am.status = 'active'
  )
);

CREATE POLICY "Users can update accessible acquisitions" ON public.acquisitions
FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquisitions.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = acquisitions.user_id
  )
);

CREATE POLICY "Users can delete accessible acquisitions" ON public.acquisitions
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = acquisitions.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = acquisitions.user_id
  )
);

-- =============================================
-- FIX: documents_achats - add agency-level access
-- =============================================
DROP POLICY IF EXISTS "Users can view their own documents_achats" ON public.documents_achats;
DROP POLICY IF EXISTS "Users can update their own documents_achats" ON public.documents_achats;
DROP POLICY IF EXISTS "Users can delete their own documents_achats" ON public.documents_achats;

CREATE POLICY "Users can view accessible documents_achats" ON public.documents_achats
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = documents_achats.user_id
    AND am.status = 'active'
  )
);

CREATE POLICY "Users can update accessible documents_achats" ON public.documents_achats
FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = documents_achats.user_id
  )
);

CREATE POLICY "Users can delete accessible documents_achats" ON public.documents_achats
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = documents_achats.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = documents_achats.user_id
  )
);

-- =============================================
-- FIX: ventes_immobilieres - UPDATE/DELETE need agency access
-- =============================================
DROP POLICY IF EXISTS "Users can update their own ventes_immobilieres" ON public.ventes_immobilieres;
DROP POLICY IF EXISTS "Users can delete their own ventes_immobilieres" ON public.ventes_immobilieres;

CREATE POLICY "Users can update accessible ventes_immobilieres" ON public.ventes_immobilieres
FOR UPDATE USING (
  auth.uid() = user_id
  OR can_gestionnaire_access_vente_immo(auth.uid(), user_id, bien_id)
);

CREATE POLICY "Users can delete accessible ventes_immobilieres" ON public.ventes_immobilieres
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = ventes_immobilieres.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = auth.uid()
    AND am.user_id = ventes_immobilieres.user_id
  )
);

-- =============================================
-- FIX: echeances_ventes - UPDATE/DELETE need agency access
-- =============================================
DROP POLICY IF EXISTS "Users can update their own echeances_ventes" ON public.echeances_ventes;
DROP POLICY IF EXISTS "Users can delete their own echeances_ventes" ON public.echeances_ventes;

CREATE POLICY "Users can update accessible echeances_ventes" ON public.echeances_ventes
FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.ventes_immobilieres vi
    WHERE vi.id = echeances_ventes.vente_id
    AND can_gestionnaire_access_vente_immo(auth.uid(), vi.user_id, vi.bien_id)
  )
);

CREATE POLICY "Users can delete accessible echeances_ventes" ON public.echeances_ventes
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.ventes_immobilieres vi
    WHERE vi.id = echeances_ventes.vente_id
    AND can_gestionnaire_access_vente_immo(auth.uid(), vi.user_id, vi.bien_id)
  )
);
