
-- Table for tracking owner disbursements/reversements
CREATE TABLE public.owner_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'especes',
  recipient_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own owner payouts"
  ON public.owner_payouts FOR SELECT
  TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));

CREATE POLICY "Users can insert own owner payouts"
  ON public.owner_payouts FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_owner(auth.uid(), user_id));

CREATE POLICY "Users can update own owner payouts"
  ON public.owner_payouts FOR UPDATE
  TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));

CREATE POLICY "Users can delete own owner payouts"
  ON public.owner_payouts FOR DELETE
  TO authenticated
  USING (public.can_access_owner(auth.uid(), user_id));
