
-- Table des bénéficiaires (collaborateurs lotisseur / famille propriétaire)
CREATE TABLE public.beneficiaires_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lotissement_id UUID NOT NULL REFERENCES public.lotissements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  lien_role TEXT,
  cni_number TEXT,
  partie TEXT NOT NULL CHECK (partie IN ('proprietaire', 'lotisseur')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beneficiaires_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own beneficiaires"
  ON public.beneficiaires_lots
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = beneficiaires_lots.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = auth.uid()
      AND am.user_id = beneficiaires_lots.user_id
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = beneficiaires_lots.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = auth.uid()
      AND am.user_id = beneficiaires_lots.user_id
    )
  );

-- Ajouter colonne beneficiaire_id sur parcelles
ALTER TABLE public.parcelles ADD COLUMN IF NOT EXISTS beneficiaire_id UUID REFERENCES public.beneficiaires_lots(id) ON DELETE SET NULL;
