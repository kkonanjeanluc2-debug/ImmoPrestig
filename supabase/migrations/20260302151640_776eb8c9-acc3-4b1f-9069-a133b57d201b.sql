
-- Add beneficiary fields to acquisitions table
ALTER TABLE public.acquisitions
  ADD COLUMN beneficiaire_type text DEFAULT 'particulier',
  ADD COLUMN beneficiaire_name text,
  ADD COLUMN beneficiaire_phone text,
  ADD COLUMN beneficiaire_email text,
  ADD COLUMN beneficiaire_address text,
  ADD COLUMN beneficiaire_cni text,
  ADD COLUMN beneficiaire_rccm text,
  ADD COLUMN beneficiaire_representant text;
