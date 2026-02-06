-- Table to track online rent payments received via KKiaPay
CREATE TABLE public.online_rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  kkiapay_transaction_id TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for withdrawal requests from KKiaPay account
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'wave',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  kkiapay_payout_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.online_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for online_rent_payments
CREATE POLICY "Users can view their own online payments"
  ON public.online_rent_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own online payments"
  ON public.online_rent_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own online payments"
  ON public.online_rent_payments FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawal requests"
  ON public.withdrawal_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own withdrawal requests"
  ON public.withdrawal_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Triggers for updated_at
CREATE TRIGGER update_online_rent_payments_updated_at
  BEFORE UPDATE ON public.online_rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();