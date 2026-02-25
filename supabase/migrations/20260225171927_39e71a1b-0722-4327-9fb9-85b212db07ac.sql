
-- Table: vendeurs (sellers for property purchases)
CREATE TABLE public.vendeurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  cni_number TEXT,
  birth_date TEXT,
  birth_place TEXT,
  profession TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own vendeurs" ON public.vendeurs FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = vendeurs.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
);
CREATE TRIGGER update_vendeurs_updated_at BEFORE UPDATE ON public.vendeurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: biens_achat (properties to purchase)
CREATE TABLE public.biens_achat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  property_type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  price NUMERIC NOT NULL,
  area NUMERIC,
  bedrooms INT,
  bathrooms INT,
  description TEXT,
  image_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  features JSONB,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'prospection' CHECK (status IN ('prospection', 'en_negociation', 'offre_faite', 'sous_compromis', 'achete', 'abandonne')),
  vendeur_id UUID REFERENCES public.vendeurs(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.biens_achat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own biens_achat" ON public.biens_achat FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = biens_achat.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
);
CREATE TRIGGER update_biens_achat_updated_at BEFORE UPDATE ON public.biens_achat FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: offres_achat (purchase offers)
CREATE TABLE public.offres_achat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID NOT NULL REFERENCES public.biens_achat(id) ON DELETE CASCADE,
  offer_amount NUMERIC NOT NULL,
  offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'acceptee', 'refusee', 'contre_offre', 'expiree')),
  counter_amount NUMERIC,
  notes TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offres_achat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own offres_achat" ON public.offres_achat FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = offres_achat.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
);
CREATE TRIGGER update_offres_achat_updated_at BEFORE UPDATE ON public.offres_achat FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: achats_immobiliers (completed purchases)
CREATE TABLE public.achats_immobiliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID NOT NULL REFERENCES public.biens_achat(id),
  vendeur_id UUID REFERENCES public.vendeurs(id),
  sale_price NUMERIC NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type TEXT NOT NULL DEFAULT 'comptant' CHECK (payment_type IN ('comptant', 'echelonne')),
  total_installments INT,
  down_payment NUMERIC,
  notary_fees NUMERIC,
  agency_fees NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.achats_immobiliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own achats_immobiliers" ON public.achats_immobiliers FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = achats_immobiliers.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
);
CREATE TRIGGER update_achats_immobiliers_updated_at BEFORE UPDATE ON public.achats_immobiliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: echeances_achats (payment installments for purchases)
CREATE TABLE public.echeances_achats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achat_id UUID NOT NULL REFERENCES public.achats_immobiliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'paye', 'en_retard')),
  paid_amount NUMERIC,
  paid_date DATE,
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.echeances_achats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own echeances_achats" ON public.echeances_achats FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = echeances_achats.user_id AND am.user_id = auth.uid() AND am.status = 'active'
  )
);
CREATE TRIGGER update_echeances_achats_updated_at BEFORE UPDATE ON public.echeances_achats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update bien status when purchase is made
CREATE OR REPLACE FUNCTION public.update_bien_achat_status_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.biens_achat SET status = 'achete', updated_at = now() WHERE id = NEW.bien_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.biens_achat SET status = 'prospection', updated_at = now() WHERE id = OLD.bien_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_bien_achat_on_purchase
AFTER INSERT OR DELETE ON public.achats_immobiliers
FOR EACH ROW
EXECUTE FUNCTION public.update_bien_achat_status_on_purchase();
