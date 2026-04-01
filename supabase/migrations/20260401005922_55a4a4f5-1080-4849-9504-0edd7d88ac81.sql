ALTER TABLE public.attestation_templates
  ADD COLUMN IF NOT EXISTS watermark_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS watermark_text TEXT,
  ADD COLUMN IF NOT EXISTS watermark_image_url TEXT,
  ADD COLUMN IF NOT EXISTS watermark_angle TEXT DEFAULT 'diagonal',
  ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS watermark_repeat BOOLEAN DEFAULT true;