
-- Allow commercials to SELECT biens_vente linked to a vente they recorded themselves
CREATE POLICY "Commercials can view biens for their own ventes"
ON public.biens_vente
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ventes_immobilieres vi
    WHERE vi.bien_id = biens_vente.id
      AND vi.sold_by = auth.uid()
  )
);

-- Allow commercials to SELECT acquereurs linked to a vente they recorded themselves
CREATE POLICY "Commercials can view acquereurs for their own ventes"
ON public.acquereurs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ventes_immobilieres vi
    WHERE vi.acquereur_id = acquereurs.id
      AND vi.sold_by = auth.uid()
  )
);
