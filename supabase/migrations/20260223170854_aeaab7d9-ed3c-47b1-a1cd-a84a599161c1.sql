
-- Create property_inventories table for furnished rental inventory
CREATE TABLE public.property_inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'entree' CHECK (type IN ('entree', 'sortie')),
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'valide', 'signe')),
  landlord_signature TEXT,
  landlord_signed_at TIMESTAMPTZ,
  tenant_signature TEXT,
  tenant_signed_at TIMESTAMPTZ,
  general_notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory_items table for individual pieces of furniture/equipment
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.property_inventories(id) ON DELETE CASCADE,
  room TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  brand TEXT,
  model TEXT,
  condition TEXT NOT NULL DEFAULT 'bon' CHECK (condition IN ('neuf', 'bon', 'use', 'a_reparer', 'hors_service')),
  observations TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_inventories
CREATE POLICY "Users can view their own inventories"
ON public.property_inventories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventories"
ON public.property_inventories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventories"
ON public.property_inventories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventories"
ON public.property_inventories FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for inventory_items
CREATE POLICY "Users can view their own inventory items"
ON public.inventory_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory items"
ON public.inventory_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items"
ON public.inventory_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items"
ON public.inventory_items FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_property_inventories_updated_at
BEFORE UPDATE ON public.property_inventories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
