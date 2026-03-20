ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS pdf_primary_color text DEFAULT '#1A365D',
  ADD COLUMN IF NOT EXISTS pdf_secondary_color text DEFAULT '#F5F5F5',
  ADD COLUMN IF NOT EXISTS pdf_text_color text DEFAULT '#FFFFFF';