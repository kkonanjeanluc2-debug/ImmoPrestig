-- Enum for plot status
CREATE TYPE public.plot_status AS ENUM ('disponible', 'reserve', 'vendu');

-- Enum for payment type
CREATE TYPE public.payment_type AS ENUM ('comptant', 'echelonne');

-- Lotissements (Land subdivisions)
CREATE TABLE public.lotissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT DEFAULT 'Abidjan',
  total_area NUMERIC,
  total_plots INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parcelles (Plots)
CREATE TABLE public.parcelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lotissement_id UUID NOT NULL REFERENCES public.lotissements(id) ON DELETE CASCADE,
  plot_number TEXT NOT NULL,
  area NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  status plot_status NOT NULL DEFAULT 'disponible',
  position_x NUMERIC,
  position_y NUMERIC,
  width NUMERIC,
  height NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lotissement_id, plot_number)
);

-- Acquéreurs (Buyers)
CREATE TABLE public.acquereurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  cni_number TEXT,
  birth_date DATE,
  birth_place TEXT,
  profession TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ventes de parcelles (Plot sales)
CREATE TABLE public.ventes_parcelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  parcelle_id UUID NOT NULL REFERENCES public.parcelles(id) ON DELETE CASCADE,
  acquereur_id UUID NOT NULL REFERENCES public.acquereurs(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_price NUMERIC NOT NULL,
  payment_type payment_type NOT NULL DEFAULT 'comptant',
  down_payment NUMERIC DEFAULT 0,
  monthly_payment NUMERIC,
  total_installments INTEGER,
  paid_installments INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'en_cours',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Échéancier de paiement (Payment schedule)
CREATE TABLE public.echeances_parcelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vente_id UUID NOT NULL REFERENCES public.ventes_parcelles(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_date DATE,
  paid_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lotissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquereurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes_parcelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echeances_parcelles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lotissements
CREATE POLICY "Users can view their own lotissements" ON public.lotissements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lotissements" ON public.lotissements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lotissements" ON public.lotissements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lotissements" ON public.lotissements FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for parcelles
CREATE POLICY "Users can view their own parcelles" ON public.parcelles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own parcelles" ON public.parcelles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parcelles" ON public.parcelles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parcelles" ON public.parcelles FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for acquereurs
CREATE POLICY "Users can view their own acquereurs" ON public.acquereurs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own acquereurs" ON public.acquereurs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own acquereurs" ON public.acquereurs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own acquereurs" ON public.acquereurs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ventes_parcelles
CREATE POLICY "Users can view their own ventes" ON public.ventes_parcelles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ventes" ON public.ventes_parcelles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ventes" ON public.ventes_parcelles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ventes" ON public.ventes_parcelles FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for echeances_parcelles
CREATE POLICY "Users can view their own echeances" ON public.echeances_parcelles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own echeances" ON public.echeances_parcelles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own echeances" ON public.echeances_parcelles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own echeances" ON public.echeances_parcelles FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_lotissements_updated_at BEFORE UPDATE ON public.lotissements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parcelles_updated_at BEFORE UPDATE ON public.parcelles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_acquereurs_updated_at BEFORE UPDATE ON public.acquereurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ventes_parcelles_updated_at BEFORE UPDATE ON public.ventes_parcelles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_echeances_parcelles_updated_at BEFORE UPDATE ON public.echeances_parcelles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update parcelle status when sold
CREATE OR REPLACE FUNCTION public.update_parcelle_status_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.parcelles SET status = 'vendu', updated_at = now() WHERE id = NEW.parcelle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.parcelles SET status = 'disponible', updated_at = now() WHERE id = OLD.parcelle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vente_parcelle_insert AFTER INSERT ON public.ventes_parcelles FOR EACH ROW EXECUTE FUNCTION public.update_parcelle_status_on_sale();
CREATE TRIGGER on_vente_parcelle_delete AFTER DELETE ON public.ventes_parcelles FOR EACH ROW EXECUTE FUNCTION public.update_parcelle_status_on_sale();