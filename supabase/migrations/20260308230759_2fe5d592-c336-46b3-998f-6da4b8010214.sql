
-- Create achat_contract_templates table
CREATE TABLE public.achat_contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'acte' CHECK (template_type IN ('acte', 'compromis')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achat_contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own achat contract templates"
  ON public.achat_contract_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own achat contract templates"
  ON public.achat_contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own achat contract templates"
  ON public.achat_contract_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own achat contract templates"
  ON public.achat_contract_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_achat_contract_templates_updated_at
  BEFORE UPDATE ON public.achat_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add permission column for achat contracts tab
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_access_achat_contracts_tab BOOLEAN NOT NULL DEFAULT false;
