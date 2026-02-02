
-- Create etats_des_lieux table for entry and exit property inspections
CREATE TABLE public.etats_des_lieux (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- General state
  general_condition TEXT CHECK (general_condition IN ('excellent', 'bon', 'moyen', 'mauvais')),
  general_comments TEXT,
  
  -- Rooms inspection (JSON array)
  rooms JSONB DEFAULT '[]'::jsonb,
  
  -- Utilities/meters readings
  electricity_meter NUMERIC,
  water_meter NUMERIC,
  gas_meter NUMERIC,
  
  -- Keys
  keys_delivered JSONB DEFAULT '[]'::jsonb,
  
  -- Photos
  photos TEXT[] DEFAULT '{}',
  
  -- Signatures
  tenant_signature TEXT,
  landlord_signature TEXT,
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'completed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etats_des_lieux ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own etats_des_lieux"
  ON public.etats_des_lieux FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own etats_des_lieux"
  ON public.etats_des_lieux FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own etats_des_lieux"
  ON public.etats_des_lieux FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own etats_des_lieux"
  ON public.etats_des_lieux FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_etats_des_lieux_updated_at
  BEFORE UPDATE ON public.etats_des_lieux
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_etats_des_lieux_tenant_id ON public.etats_des_lieux(tenant_id);
CREATE INDEX idx_etats_des_lieux_type ON public.etats_des_lieux(type);
