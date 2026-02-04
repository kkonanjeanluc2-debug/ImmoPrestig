-- Add default contract template column to owners table
ALTER TABLE public.owners 
ADD COLUMN default_contract_template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.owners.default_contract_template_id IS 'Default contract template to use for tenants of this owner properties';