ALTER TABLE public.attestation_templates
  ADD COLUMN IF NOT EXISTS page_border_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_border_color text DEFAULT '#8B4513',
  ADD COLUMN IF NOT EXISTS page_border_style text DEFAULT 'geometric';