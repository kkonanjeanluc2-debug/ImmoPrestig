
-- Table des acquisitions de biens (donation, héritage, apport en société, échange)
CREATE TABLE public.acquisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID REFERENCES public.biens_achat(id) ON DELETE CASCADE NOT NULL,
  type_acquisition TEXT NOT NULL DEFAULT 'donation',
  -- Common fields
  date_acquisition DATE NOT NULL DEFAULT CURRENT_DATE,
  valeur_estimee NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'en_cours',
  notes TEXT,
  -- Counterpart info (donateur, défunt, société, échangeur)
  counterpart_name TEXT,
  counterpart_phone TEXT,
  counterpart_email TEXT,
  counterpart_address TEXT,
  -- Heritage specific
  date_deces DATE,
  lien_parente TEXT,
  numero_succession TEXT,
  -- Donation specific  
  type_donation TEXT,
  -- Apport en société specific
  societe_name TEXT,
  societe_siret TEXT,
  type_apport TEXT,
  -- Échange specific
  bien_echange_description TEXT,
  valeur_bien_echange NUMERIC,
  -- Notaire info
  notaire_name TEXT,
  notaire_phone TEXT,
  notaire_email TEXT,
  notaire_address TEXT,
  -- Documents checklist
  titre_propriete BOOLEAN DEFAULT FALSE,
  pieces_identite BOOLEAN DEFAULT FALSE,
  certificat_localisation BOOLEAN DEFAULT FALSE,
  acte_notarie BOOLEAN DEFAULT FALSE,
  attestation_fiscale BOOLEAN DEFAULT FALSE,
  -- Dates workflow
  date_acte_signe DATE,
  date_enregistrement DATE,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acquisitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own acquisitions"
  ON public.acquisitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own acquisitions"
  ON public.acquisitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own acquisitions"
  ON public.acquisitions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own acquisitions"
  ON public.acquisitions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_acquisitions_updated_at
  BEFORE UPDATE ON public.acquisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
