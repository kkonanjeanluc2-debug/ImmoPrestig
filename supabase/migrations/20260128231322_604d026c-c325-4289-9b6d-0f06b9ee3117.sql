-- Create ilots table
CREATE TABLE public.ilots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lotissement_id UUID NOT NULL REFERENCES public.lotissements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_area NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add ilot_id to parcelles table
ALTER TABLE public.parcelles ADD COLUMN ilot_id UUID REFERENCES public.ilots(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.ilots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ilots
CREATE POLICY "Users can view their own ilots" 
ON public.ilots FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ilots" 
ON public.ilots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ilots" 
ON public.ilots FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ilots" 
ON public.ilots FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ilots_updated_at
BEFORE UPDATE ON public.ilots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_ilots_lotissement_id ON public.ilots(lotissement_id);
CREATE INDEX idx_parcelles_ilot_id ON public.parcelles(ilot_id);