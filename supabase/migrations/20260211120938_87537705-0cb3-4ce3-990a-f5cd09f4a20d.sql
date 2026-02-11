
-- Create reservations_parcelles table
CREATE TABLE public.reservations_parcelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parcelle_id UUID NOT NULL REFERENCES public.parcelles(id) ON DELETE CASCADE,
  acquereur_id UUID NOT NULL REFERENCES public.acquereurs(id) ON DELETE CASCADE,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_days INTEGER NOT NULL DEFAULT 30,
  expiry_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'converted')),
  converted_vente_id UUID REFERENCES public.ventes_parcelles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations_parcelles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reservations parcelles"
ON public.reservations_parcelles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.status = 'active'
  )
);

CREATE POLICY "Users can create reservations parcelles"
ON public.reservations_parcelles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations parcelles"
ON public.reservations_parcelles FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

CREATE POLICY "Users can delete their own reservations parcelles"
ON public.reservations_parcelles FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = reservations_parcelles.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_reservations_parcelles_updated_at
BEFORE UPDATE ON public.reservations_parcelles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update parcelle status to 'reserve' on reservation
CREATE OR REPLACE FUNCTION public.update_parcelle_status_on_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.parcelles SET status = 'reserve'::plot_status WHERE id = NEW.parcelle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    -- Only reset to disponible if no other active reservation and no sale exists
    IF NOT EXISTS (
      SELECT 1 FROM public.ventes_parcelles WHERE parcelle_id = NEW.parcelle_id
    ) THEN
      UPDATE public.parcelles SET status = 'disponible'::plot_status WHERE id = NEW.parcelle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_parcelle_on_reservation
AFTER INSERT OR UPDATE ON public.reservations_parcelles
FOR EACH ROW
EXECUTE FUNCTION public.update_parcelle_status_on_reservation();
