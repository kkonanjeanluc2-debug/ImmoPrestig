ALTER TABLE public.attestation_templates
  ADD COLUMN IF NOT EXISTS watermark_position_x numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS watermark_position_y numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS watermark_rotation numeric DEFAULT -45;