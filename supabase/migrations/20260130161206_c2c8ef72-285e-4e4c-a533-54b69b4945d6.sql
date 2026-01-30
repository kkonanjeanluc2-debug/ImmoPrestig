-- Create table for property interventions (repairs, procedures, maintenance)
CREATE TABLE public.property_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'reparation', -- reparation, procedure, maintenance, autre
  status TEXT NOT NULL DEFAULT 'en_cours', -- en_cours, termine, annule
  priority TEXT NOT NULL DEFAULT 'normale', -- basse, normale, haute, urgente
  cost NUMERIC,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  provider_name TEXT, -- artisan, entreprise, etc.
  provider_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own interventions"
ON public.property_interventions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interventions"
ON public.property_interventions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interventions"
ON public.property_interventions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interventions"
ON public.property_interventions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_property_interventions_updated_at
BEFORE UPDATE ON public.property_interventions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();