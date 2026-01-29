-- Enum for property sale status
CREATE TYPE public.property_sale_status AS ENUM ('disponible', 'reserve', 'vendu');

-- Enum for sale payment status
CREATE TYPE public.sale_payment_status AS ENUM ('en_cours', 'complete', 'annule');

-- Table for properties for sale (separate from rental properties)
CREATE TABLE public.biens_vente (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Abidjan',
    property_type TEXT NOT NULL, -- maison, appartement, terrain, immeuble, villa
    description TEXT,
    price NUMERIC NOT NULL,
    area NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    image_url TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    status property_sale_status NOT NULL DEFAULT 'disponible',
    features JSONB DEFAULT '[]',
    assigned_to UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.biens_vente ENABLE ROW LEVEL SECURITY;

-- RLS policies for biens_vente
CREATE POLICY "Users can view accessible biens_vente" ON public.biens_vente
    FOR SELECT USING (can_access_property(auth.uid(), user_id, assigned_to));

CREATE POLICY "Users can insert their own biens_vente" ON public.biens_vente
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agency owners and admins can update biens_vente" ON public.biens_vente
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM agencies a
            JOIN agency_members am ON am.agency_id = a.id
            WHERE a.user_id = biens_vente.user_id
            AND am.user_id = auth.uid()
            AND am.role = 'admin'::app_role
            AND am.status = 'active'
        )
    );

CREATE POLICY "Users can delete their own biens_vente" ON public.biens_vente
    FOR DELETE USING (auth.uid() = user_id);

-- Table for property sales transactions
CREATE TABLE public.ventes_immobilieres (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    bien_id UUID NOT NULL REFERENCES public.biens_vente(id) ON DELETE CASCADE,
    acquereur_id UUID NOT NULL REFERENCES public.acquereurs(id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price NUMERIC NOT NULL,
    payment_type payment_type NOT NULL DEFAULT 'comptant',
    payment_method TEXT,
    down_payment NUMERIC DEFAULT 0,
    monthly_payment NUMERIC,
    total_installments INTEGER,
    paid_installments INTEGER DEFAULT 0,
    status sale_payment_status NOT NULL DEFAULT 'en_cours',
    notes TEXT,
    sold_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ventes_immobilieres ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view accessible ventes_immobilieres" ON public.ventes_immobilieres
    FOR SELECT USING (can_access_vente_parcelle(auth.uid(), user_id, sold_by));

CREATE POLICY "Users can insert their own ventes_immobilieres" ON public.ventes_immobilieres
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ventes_immobilieres" ON public.ventes_immobilieres
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ventes_immobilieres" ON public.ventes_immobilieres
    FOR DELETE USING (auth.uid() = user_id);

-- Table for payment installments
CREATE TABLE public.echeances_ventes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    vente_id UUID NOT NULL REFERENCES public.ventes_immobilieres(id) ON DELETE CASCADE,
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
ALTER TABLE public.echeances_ventes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own echeances_ventes" ON public.echeances_ventes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own echeances_ventes" ON public.echeances_ventes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own echeances_ventes" ON public.echeances_ventes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own echeances_ventes" ON public.echeances_ventes
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_biens_vente_user_id ON public.biens_vente(user_id);
CREATE INDEX idx_biens_vente_status ON public.biens_vente(status);
CREATE INDEX idx_biens_vente_deleted_at ON public.biens_vente(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_ventes_immobilieres_user_id ON public.ventes_immobilieres(user_id);
CREATE INDEX idx_ventes_immobilieres_bien_id ON public.ventes_immobilieres(bien_id);
CREATE INDEX idx_echeances_ventes_vente_id ON public.echeances_ventes(vente_id);
CREATE INDEX idx_echeances_ventes_status ON public.echeances_ventes(status);

-- Trigger to update bien status on sale
CREATE OR REPLACE FUNCTION public.update_bien_status_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.biens_vente SET status = 'vendu', updated_at = now() WHERE id = NEW.bien_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.biens_vente SET status = 'disponible', updated_at = now() WHERE id = OLD.bien_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_bien_on_sale
    AFTER INSERT OR DELETE ON public.ventes_immobilieres
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bien_status_on_sale();

-- Add updated_at trigger
CREATE TRIGGER update_biens_vente_updated_at
    BEFORE UPDATE ON public.biens_vente
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ventes_immobilieres_updated_at
    BEFORE UPDATE ON public.ventes_immobilieres
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_echeances_ventes_updated_at
    BEFORE UPDATE ON public.echeances_ventes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();