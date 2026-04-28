ALTER TABLE public.apports
  ADD COLUMN IF NOT EXISTS vente_immobiliere_id uuid REFERENCES public.ventes_immobilieres(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vente_parcelle_id uuid REFERENCES public.ventes_parcelles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_apports_vente_immobiliere ON public.apports(vente_immobiliere_id);
CREATE INDEX IF NOT EXISTS idx_apports_vente_parcelle ON public.apports(vente_parcelle_id);