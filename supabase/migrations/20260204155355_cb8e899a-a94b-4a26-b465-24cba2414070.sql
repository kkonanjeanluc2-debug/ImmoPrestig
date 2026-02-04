-- Add contract_template_id to management_types table
ALTER TABLE public.management_types 
ADD COLUMN contract_template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL;