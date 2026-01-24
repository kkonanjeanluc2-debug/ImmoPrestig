-- Create management_types table for agency-specific management fee configurations
CREATE TABLE public.management_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  percentage NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'gestion_locative', -- 'gestion_locative' or 'commission_vente'
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.management_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own management types" 
ON public.management_types 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own management types" 
ON public.management_types 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own management types" 
ON public.management_types 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own management types" 
ON public.management_types 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add management_type_id to owners table
ALTER TABLE public.owners 
ADD COLUMN management_type_id UUID REFERENCES public.management_types(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_management_types_updated_at
BEFORE UPDATE ON public.management_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();