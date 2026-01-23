-- Create payment transactions table for tracking FedaPay payments
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.agency_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  
  -- FedaPay transaction details
  fedapay_transaction_id TEXT,
  fedapay_reference TEXT,
  
  -- Amount and currency
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  
  -- Payment method (orange_money, mtn_money, wave, moov, card)
  payment_method TEXT NOT NULL,
  
  -- Status: pending, completed, failed, cancelled, refunded
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Billing info
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly or yearly
  
  -- Customer info
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  
  -- Metadata
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions via agency
CREATE POLICY "Users can view their own transactions"
ON public.payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = payment_transactions.agency_id 
    AND agencies.user_id = auth.uid()
  )
);

-- Super admins can view all transactions
CREATE POLICY "Super admins can view all transactions"
ON public.payment_transactions
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage transactions
CREATE POLICY "Super admins can insert transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update transactions"
ON public.payment_transactions
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Service role (edge functions) can manage transactions - using a special policy
-- Edge functions will use service role key which bypasses RLS

-- Create index for faster lookups
CREATE INDEX idx_payment_transactions_agency ON public.payment_transactions(agency_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_fedapay_id ON public.payment_transactions(fedapay_transaction_id);

-- Add updated_at trigger
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();