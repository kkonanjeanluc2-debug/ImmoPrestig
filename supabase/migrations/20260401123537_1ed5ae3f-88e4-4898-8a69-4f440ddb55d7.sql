
-- Create mutations_parcelles table for tracking lot resales
CREATE TABLE public.mutations_parcelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  vente_id UUID REFERENCES public.ventes_parcelles(id) ON DELETE CASCADE NOT NULL,
  parcelle_id UUID REFERENCES public.parcelles(id) ON DELETE CASCADE NOT NULL,
  ancien_acquereur_id UUID REFERENCES public.acquereurs(id) NOT NULL,
  nouvel_acquereur_id UUID REFERENCES public.acquereurs(id) NOT NULL,
  mutation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mutation_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mutations_parcelles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mutations"
  ON public.mutations_parcelles
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_vente_parcelle(auth.uid(), user_id, NULL)
  );

CREATE POLICY "Users can insert their own mutations"
  ON public.mutations_parcelles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mutations"
  ON public.mutations_parcelles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mutations"
  ON public.mutations_parcelles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
