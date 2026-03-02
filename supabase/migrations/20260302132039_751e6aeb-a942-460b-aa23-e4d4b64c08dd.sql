
-- Add acquereur_id to achats_immobiliers
ALTER TABLE public.achats_immobiliers
ADD COLUMN acquereur_id UUID REFERENCES public.acquereurs(id);

-- Add commission_percentage column for agency commission tracking
ALTER TABLE public.achats_immobiliers
ADD COLUMN commission_percentage NUMERIC DEFAULT 0;

-- Add commission_amount column
ALTER TABLE public.achats_immobiliers
ADD COLUMN commission_amount NUMERIC DEFAULT 0;
