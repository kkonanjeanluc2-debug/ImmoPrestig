
ALTER TABLE public.lotissements
ADD COLUMN cession_template_id uuid REFERENCES public.attestation_templates(id) ON DELETE SET NULL;
