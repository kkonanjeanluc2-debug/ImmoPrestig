
-- Table pour les documents légaux du lotissement
CREATE TABLE public.lotissement_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lotissement_id UUID NOT NULL REFERENCES public.lotissements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'titre_foncier', 'permis_lotir', 'arrete_approbation', 'plan_cadastral', 'certificat_conformite', 'autre'
  file_url TEXT,
  file_size TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'valid', 'expired', 'rejected'
  expiry_date DATE,
  reference_number TEXT,
  issued_by TEXT,
  issued_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le statut administratif des parcelles
CREATE TABLE public.parcelle_admin_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parcelle_id UUID NOT NULL REFERENCES public.parcelles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente', 'en_cours', 'valide', 'litige', 'bloque'
  titre_foncier_status TEXT DEFAULT 'non_demande', -- 'non_demande', 'en_cours', 'obtenu'
  titre_foncier_reference TEXT,
  attestation_villageoise BOOLEAN DEFAULT false,
  certificat_propriete BOOLEAN DEFAULT false,
  bornage_effectue BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parcelle_id)
);

-- Table pour l'historique des démarches administratives
CREATE TABLE public.demarches_administratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lotissement_id UUID NOT NULL REFERENCES public.lotissements(id) ON DELETE CASCADE,
  parcelle_id UUID REFERENCES public.parcelles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'demande_titre', 'bornage', 'certificat', 'reclamation', 'visite_terrain', 'autre'
  title TEXT NOT NULL,
  description TEXT,
  authority TEXT, -- 'mairie', 'prefecture', 'ministere', 'cadastre', 'tribunal', 'autre'
  contact_person TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'en_cours', -- 'en_cours', 'termine', 'en_attente', 'rejete'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  result TEXT,
  cost NUMERIC,
  documents_required TEXT[],
  documents_submitted TEXT[],
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lotissement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelle_admin_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demarches_administratives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lotissement_documents
CREATE POLICY "Users can view their own lotissement documents"
  ON public.lotissement_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lotissement documents"
  ON public.lotissement_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lotissement documents"
  ON public.lotissement_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lotissement documents"
  ON public.lotissement_documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for parcelle_admin_status
CREATE POLICY "Users can view their own parcelle admin status"
  ON public.parcelle_admin_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelle admin status"
  ON public.parcelle_admin_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelle admin status"
  ON public.parcelle_admin_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelle admin status"
  ON public.parcelle_admin_status FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for demarches_administratives
CREATE POLICY "Users can view their own demarches"
  ON public.demarches_administratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own demarches"
  ON public.demarches_administratives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demarches"
  ON public.demarches_administratives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own demarches"
  ON public.demarches_administratives FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_lotissement_documents_updated_at
  BEFORE UPDATE ON public.lotissement_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcelle_admin_status_updated_at
  BEFORE UPDATE ON public.parcelle_admin_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demarches_administratives_updated_at
  BEFORE UPDATE ON public.demarches_administratives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
