-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('agence', 'proprietaire');

-- Create agencies table for multi-tenant support
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  account_type account_type NOT NULL DEFAULT 'agence',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Sénégal',
  latitude NUMERIC,
  longitude NUMERIC,
  logo_url TEXT,
  siret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- RLS policies for agencies
CREATE POLICY "Users can view their own agency"
  ON public.agencies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agency"
  ON public.agencies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency"
  ON public.agencies FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();