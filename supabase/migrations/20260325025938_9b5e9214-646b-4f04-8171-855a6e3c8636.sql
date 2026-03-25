ALTER TABLE public.attestation_templates 
  ADD COLUMN IF NOT EXISTS doc_bg_color_1 text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_bg_color_2 text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_bg_gradient boolean DEFAULT false;