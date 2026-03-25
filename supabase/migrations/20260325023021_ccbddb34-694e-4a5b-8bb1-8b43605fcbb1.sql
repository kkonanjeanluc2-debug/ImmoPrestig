ALTER TABLE public.attestation_templates 
  ADD COLUMN IF NOT EXISTS banner_color_1 TEXT DEFAULT '#003399',
  ADD COLUMN IF NOT EXISTS banner_color_2 TEXT,
  ADD COLUMN IF NOT EXISTS banner_gradient BOOLEAN DEFAULT false;