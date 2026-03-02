
ALTER TABLE public.offres_achat ADD COLUMN acquereur_id UUID REFERENCES public.acquereurs(id) ON DELETE SET NULL;
