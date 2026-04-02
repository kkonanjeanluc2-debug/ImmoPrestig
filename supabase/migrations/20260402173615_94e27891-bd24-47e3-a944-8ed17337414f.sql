
-- Add colocation flag to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS is_colocation boolean NOT NULL DEFAULT false;

-- Create colocation_tenants table for linking multiple tenants to a single colocation contract
CREATE TABLE public.colocation_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_principal boolean NOT NULL DEFAULT false,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.colocation_tenants ENABLE ROW LEVEL SECURITY;

-- RLS policies for colocation_tenants
CREATE POLICY "Users can view their own colocation tenants"
  ON public.colocation_tenants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_access_contract_via_property(auth.uid(), contract_id)
  );

CREATE POLICY "Users can insert their own colocation tenants"
  ON public.colocation_tenants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own colocation tenants"
  ON public.colocation_tenants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own colocation tenants"
  ON public.colocation_tenants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add colocation contract template
CREATE TABLE IF NOT EXISTS public.colocation_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colocation_contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own colocation templates"
  ON public.colocation_contract_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own colocation templates"
  ON public.colocation_contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own colocation templates"
  ON public.colocation_contract_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own colocation templates"
  ON public.colocation_contract_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
