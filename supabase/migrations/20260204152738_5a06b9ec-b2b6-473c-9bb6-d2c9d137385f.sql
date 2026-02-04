-- Create sale_contract_templates table
CREATE TABLE public.sale_contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sale_contract_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sale contract templates" 
ON public.sale_contract_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sale contract templates" 
ON public.sale_contract_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sale contract templates" 
ON public.sale_contract_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sale contract templates" 
ON public.sale_contract_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sale_contract_templates_updated_at
BEFORE UPDATE ON public.sale_contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();