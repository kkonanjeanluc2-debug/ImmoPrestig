-- Create reservations table to store reservation details for regenerating contracts
CREATE TABLE public.reservations_vente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID NOT NULL REFERENCES public.biens_vente(id) ON DELETE CASCADE,
  acquereur_id UUID NOT NULL REFERENCES public.acquereurs(id) ON DELETE RESTRICT,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_days INTEGER NOT NULL DEFAULT 30,
  expiry_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, converted (to sale)
  converted_vente_id UUID REFERENCES public.ventes_immobilieres(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations_vente ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reservations" 
ON public.reservations_vente 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reservations" 
ON public.reservations_vente 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations" 
ON public.reservations_vente 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations" 
ON public.reservations_vente 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reservations_vente_updated_at
BEFORE UPDATE ON public.reservations_vente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();