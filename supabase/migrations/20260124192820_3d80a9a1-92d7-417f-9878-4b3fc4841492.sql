-- Create property_units table for multi-door properties
CREATE TABLE public.property_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  unit_number TEXT NOT NULL,
  rooms_count INTEGER NOT NULL DEFAULT 1,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  area NUMERIC,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own property units"
ON public.property_units
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property units"
ON public.property_units
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own property units"
ON public.property_units
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property units"
ON public.property_units
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_property_units_updated_at
BEFORE UPDATE ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unit_id to contracts table (optional, for unit-specific contracts)
ALTER TABLE public.contracts ADD COLUMN unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL;

-- Add unit_id to tenants table (optional, for unit-specific tenant assignment)
ALTER TABLE public.tenants ADD COLUMN unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL;