
-- Add content field to attestation_templates (markdown body like contract templates)
ALTER TABLE public.attestation_templates ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';

-- Add chef_village info to lotissements table
ALTER TABLE public.lotissements ADD COLUMN IF NOT EXISTS chef_village_name text;
ALTER TABLE public.lotissements ADD COLUMN IF NOT EXISTS chef_village_titre text;

-- Remove chef_village fields from attestation_templates (moved to lotissements)
ALTER TABLE public.attestation_templates DROP COLUMN IF EXISTS chef_village_name;
ALTER TABLE public.attestation_templates DROP COLUMN IF EXISTS chef_village_titre;
