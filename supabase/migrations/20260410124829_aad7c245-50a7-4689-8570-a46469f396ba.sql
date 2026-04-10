
CREATE TABLE public.payout_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner_email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  amount NUMERIC,
  payout_month TEXT,
  payout_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTP codes"
  ON public.payout_otp_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OTP codes"
  ON public.payout_otp_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTP codes"
  ON public.payout_otp_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_payout_otp_lookup ON public.payout_otp_codes (user_id, owner_email, otp_code, used);
