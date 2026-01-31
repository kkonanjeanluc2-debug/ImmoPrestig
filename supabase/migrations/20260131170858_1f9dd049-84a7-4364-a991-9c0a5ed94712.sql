-- Create prospects table for biens_vente
CREATE TABLE public.vente_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID NOT NULL REFERENCES public.biens_vente(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  interest_level TEXT NOT NULL DEFAULT 'moyen' CHECK (interest_level IN ('faible', 'moyen', 'eleve')),
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'contacte', 'interesse', 'negociation', 'perdu', 'converti')),
  notes TEXT,
  first_contact_date DATE,
  last_contact_date DATE,
  next_followup_date DATE,
  source TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vente_prospects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vente prospects"
ON public.vente_prospects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vente prospects"
ON public.vente_prospects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vente prospects"
ON public.vente_prospects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vente prospects"
ON public.vente_prospects FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_vente_prospects_updated_at
BEFORE UPDATE ON public.vente_prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();