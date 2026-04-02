
-- Table apporteurs d'affaires
CREATE TABLE public.apporteurs_affaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  cni_number TEXT,
  commission_percentage NUMERIC DEFAULT 5,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table apports (historique des affaires apportées)
CREATE TABLE public.apports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  apporteur_id UUID REFERENCES public.apporteurs_affaires(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC,
  description TEXT,
  apport_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'en_attente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apporteurs_affaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apports ENABLE ROW LEVEL SECURITY;

-- RLS policies for apporteurs_affaires
CREATE POLICY "Users can view own apporteurs" ON public.apporteurs_affaires
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apporteurs_affaires.user_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = auth.uid()
        AND am.user_id = apporteurs_affaires.user_id
    )
  );

CREATE POLICY "Users can create apporteurs" ON public.apporteurs_affaires
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own apporteurs" ON public.apporteurs_affaires
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apporteurs_affaires.user_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
  );

CREATE POLICY "Users can delete own apporteurs" ON public.apporteurs_affaires
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apporteurs_affaires.user_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
  );

-- RLS policies for apports
CREATE POLICY "Users can view own apports" ON public.apports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apports.user_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

CREATE POLICY "Users can create apports" ON public.apports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own apports" ON public.apports
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apports.user_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
  );

CREATE POLICY "Users can delete own apports" ON public.apports
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = apports.user_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
  );
