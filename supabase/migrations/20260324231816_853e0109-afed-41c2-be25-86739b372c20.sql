
-- Add repartition columns to lotissements
ALTER TABLE public.lotissements 
  ADD COLUMN IF NOT EXISTS repartition_proprietaire integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS repartition_lotisseur integer DEFAULT 70,
  ADD COLUMN IF NOT EXISTS proprietaire_name text,
  ADD COLUMN IF NOT EXISTS lotisseur_name text;

-- Add attribution column to parcelles to track who the lot belongs to
ALTER TABLE public.parcelles 
  ADD COLUMN IF NOT EXISTS attribution text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.parcelles.attribution IS 'proprietaire or lotisseur - indicates lot ownership based on convention repartition';
