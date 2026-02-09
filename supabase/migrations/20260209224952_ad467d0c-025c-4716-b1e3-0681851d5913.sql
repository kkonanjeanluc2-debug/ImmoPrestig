
-- Create promesse_vente_templates table
CREATE TABLE public.promesse_vente_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promesse_vente_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own promesse vente templates"
ON public.promesse_vente_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promesse vente templates"
ON public.promesse_vente_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own promesse vente templates"
ON public.promesse_vente_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own promesse vente templates"
ON public.promesse_vente_templates FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_promesse_vente_templates_updated_at
BEFORE UPDATE ON public.promesse_vente_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
