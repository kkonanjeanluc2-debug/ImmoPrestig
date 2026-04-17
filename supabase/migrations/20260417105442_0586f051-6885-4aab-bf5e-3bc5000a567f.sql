ALTER TABLE public.attestation_templates
ADD COLUMN IF NOT EXISTS header_ministere TEXT,
ADD COLUMN IF NOT EXISTS header_region TEXT,
ADD COLUMN IF NOT EXISTS header_departement TEXT,
ADD COLUMN IF NOT EXISTS header_republique TEXT DEFAULT 'République de Côte d''Ivoire',
ADD COLUMN IF NOT EXISTS header_devise TEXT DEFAULT 'Union-Discipline-Travail';