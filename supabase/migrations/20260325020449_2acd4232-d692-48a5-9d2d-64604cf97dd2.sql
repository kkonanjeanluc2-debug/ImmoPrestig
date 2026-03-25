
-- Add chef stamp and signature images to lotissements
ALTER TABLE public.lotissements ADD COLUMN IF NOT EXISTS chef_stamp_url text;
ALTER TABLE public.lotissements ADD COLUMN IF NOT EXISTS chef_signature_url text;
