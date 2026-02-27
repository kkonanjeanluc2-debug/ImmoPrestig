
-- Table pour le suivi des mutations foncières
CREATE TABLE public.mutations_achats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achat_id UUID NOT NULL REFERENCES public.achats_immobiliers(id) ON DELETE CASCADE,
  bien_id UUID NOT NULL REFERENCES public.biens_achat(id),
  
  -- Statut du workflow
  status TEXT NOT NULL DEFAULT 'offre_creee' CHECK (status IN ('offre_creee', 'dossier_constitue', 'acte_signe', 'depot_notaire', 'mutation_enregistree')),
  
  -- Informations notaire
  notaire_name TEXT,
  notaire_phone TEXT,
  notaire_email TEXT,
  notaire_address TEXT,
  
  -- Documents requis
  titre_propriete BOOLEAN DEFAULT false,
  pieces_identite BOOLEAN DEFAULT false,
  certificat_localisation BOOLEAN DEFAULT false,
  etat_foncier BOOLEAN DEFAULT false,
  situation_fiscale BOOLEAN DEFAULT false,
  quittances_paiement BOOLEAN DEFAULT false,
  
  -- Coûts
  droits_enregistrement NUMERIC DEFAULT 0,
  taxe_publicite NUMERIC DEFAULT 0,
  frais_fixes NUMERIC DEFAULT 0,
  frais_notariaux NUMERIC DEFAULT 0,
  
  -- Dates clés
  date_acte_signe TIMESTAMPTZ,
  date_depot_notaire TIMESTAMPTZ,
  date_mutation_enregistree TIMESTAMPTZ,
  
  -- Type de mutation
  type_mutation TEXT NOT NULL DEFAULT 'vente' CHECK (type_mutation IN ('vente', 'donation', 'heritage', 'transfert_lot')),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mutations_achats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mutations"
  ON public.mutations_achats FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = mutations_achats.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can insert their own mutations"
  ON public.mutations_achats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mutations"
  ON public.mutations_achats FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = mutations_achats.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can delete their own mutations"
  ON public.mutations_achats FOR DELETE
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_mutations_achats_updated_at
  BEFORE UPDATE ON public.mutations_achats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: one mutation per achat
ALTER TABLE public.mutations_achats ADD CONSTRAINT unique_mutation_per_achat UNIQUE (achat_id);
