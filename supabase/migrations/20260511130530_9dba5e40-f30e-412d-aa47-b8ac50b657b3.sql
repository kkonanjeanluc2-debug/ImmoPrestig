-- Add 'prefinance' to plot_status enum
ALTER TYPE plot_status ADD VALUE IF NOT EXISTS 'prefinance';

-- Create prefinanceurs table
CREATE TABLE IF NOT EXISTS public.prefinanceurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  cni_number TEXT,
  rccm TEXT,
  representant TEXT,
  type TEXT NOT NULL DEFAULT 'individu',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prefinanceurs ENABLE ROW LEVEL SECURITY;

-- RLS: owner (and agency admins acting as owner) can read/write
CREATE POLICY "Users manage own prefinanceurs select"
ON public.prefinanceurs FOR SELECT
USING (auth.uid() = user_id OR is_admin_of_owner(auth.uid(), user_id));

CREATE POLICY "Users manage own prefinanceurs insert"
ON public.prefinanceurs FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin_of_owner(auth.uid(), user_id));

CREATE POLICY "Users manage own prefinanceurs update"
ON public.prefinanceurs FOR UPDATE
USING (auth.uid() = user_id OR is_admin_of_owner(auth.uid(), user_id))
WITH CHECK (auth.uid() = user_id OR is_admin_of_owner(auth.uid(), user_id));

CREATE POLICY "Users manage own prefinanceurs delete"
ON public.prefinanceurs FOR DELETE
USING (auth.uid() = user_id OR is_admin_of_owner(auth.uid(), user_id));

CREATE TRIGGER update_prefinanceurs_updated_at
BEFORE UPDATE ON public.prefinanceurs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link parcelle to prefinanceur
ALTER TABLE public.parcelles
ADD COLUMN IF NOT EXISTS prefinanceur_id UUID REFERENCES public.prefinanceurs(id) ON DELETE SET NULL;
