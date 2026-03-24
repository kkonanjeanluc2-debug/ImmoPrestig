
-- Table pour les factures proforma et définitives
CREATE TABLE public.proforma_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'proforma' CHECK (invoice_type IN ('proforma', 'definitive')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'validated', 'converted', 'cancelled')),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  tenant_email TEXT,
  property_name TEXT,
  unit_number TEXT,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  notes TEXT,
  due_date DATE,
  converted_from_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own invoices" ON public.proforma_invoices
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = proforma_invoices.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = auth.uid()
      AND am.user_id = proforma_invoices.user_id
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can insert own invoices" ON public.proforma_invoices
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own invoices" ON public.proforma_invoices
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = proforma_invoices.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can delete own invoices" ON public.proforma_invoices
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Counter for invoice numbering
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS proforma_counter INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS invoice_counter INTEGER NOT NULL DEFAULT 0;

-- Function to get next proforma number
CREATE OR REPLACE FUNCTION public.get_next_proforma_number(_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_val integer;
  current_year text;
BEGIN
  current_year := to_char(now(), 'YYYY');
  UPDATE public.agencies
  SET proforma_counter = proforma_counter + 1
  WHERE id = _agency_id
  RETURNING proforma_counter INTO next_val;
  RETURN 'PF-' || current_year || '-' || LPAD(next_val::text, 3, '0');
END;
$$;

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_val integer;
  current_year text;
BEGIN
  current_year := to_char(now(), 'YYYY');
  UPDATE public.agencies
  SET invoice_counter = invoice_counter + 1
  WHERE id = _agency_id
  RETURNING invoice_counter INTO next_val;
  RETURN 'F-' || current_year || '-' || LPAD(next_val::text, 3, '0');
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_proforma_invoices_updated_at
  BEFORE UPDATE ON public.proforma_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
