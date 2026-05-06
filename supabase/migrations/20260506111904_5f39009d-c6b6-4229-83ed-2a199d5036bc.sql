ALTER TABLE public.demarches_administratives 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS proof_size TEXT;