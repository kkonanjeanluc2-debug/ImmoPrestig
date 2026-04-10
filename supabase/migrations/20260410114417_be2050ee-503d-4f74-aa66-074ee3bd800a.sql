
CREATE TABLE public.payout_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID REFERENCES public.owner_payouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_type TEXT NOT NULL DEFAULT 'typed',
  signature_data TEXT,
  signature_text TEXT,
  signature_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payout signatures"
  ON public.payout_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create payout signatures"
  ON public.payout_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout signatures"
  ON public.payout_signatures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_payout_signatures_token ON public.payout_signatures(signature_token);
CREATE INDEX idx_payout_signatures_payout ON public.payout_signatures(payout_id);
