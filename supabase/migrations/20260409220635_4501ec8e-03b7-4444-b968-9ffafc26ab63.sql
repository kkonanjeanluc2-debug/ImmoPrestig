
CREATE TABLE public.payout_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTPs"
ON public.payout_otps FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OTPs"
ON public.payout_otps FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OTPs"
ON public.payout_otps FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_payout_otps_user_id ON public.payout_otps (user_id);
CREATE INDEX idx_payout_otps_expires ON public.payout_otps (expires_at);
