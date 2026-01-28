-- Create enum for interest level
CREATE TYPE public.interest_level AS ENUM ('faible', 'moyen', 'eleve');

-- Create enum for prospect status
CREATE TYPE public.prospect_status AS ENUM ('nouveau', 'contacte', 'interesse', 'negociation', 'perdu', 'converti');

-- Create table for parcelle prospects
CREATE TABLE public.parcelle_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parcelle_id UUID NOT NULL REFERENCES public.parcelles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  interest_level interest_level NOT NULL DEFAULT 'moyen',
  status prospect_status NOT NULL DEFAULT 'nouveau',
  notes TEXT,
  first_contact_date DATE DEFAULT CURRENT_DATE,
  last_contact_date DATE,
  next_followup_date DATE,
  source TEXT DEFAULT 'direct',
  budget_min NUMERIC,
  budget_max NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parcelle_prospects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own prospects"
ON public.parcelle_prospects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospects"
ON public.parcelle_prospects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospects"
ON public.parcelle_prospects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospects"
ON public.parcelle_prospects FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_parcelle_prospects_updated_at
BEFORE UPDATE ON public.parcelle_prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_parcelle_prospects_parcelle_id ON public.parcelle_prospects(parcelle_id);
CREATE INDEX idx_parcelle_prospects_status ON public.parcelle_prospects(status);
CREATE INDEX idx_parcelle_prospects_next_followup ON public.parcelle_prospects(next_followup_date);