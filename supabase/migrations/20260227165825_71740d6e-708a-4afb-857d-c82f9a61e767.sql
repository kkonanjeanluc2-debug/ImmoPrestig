
-- Add a JSONB column to track per-document submission dates to notary
ALTER TABLE public.mutations_achats 
ADD COLUMN IF NOT EXISTS documents_transmis JSONB DEFAULT '{}'::jsonb;

-- Example structure: {"titre_propriete": "2026-02-27", "pieces_identite": "2026-02-28"}
