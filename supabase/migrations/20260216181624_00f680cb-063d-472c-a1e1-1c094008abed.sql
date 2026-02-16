
-- Add paid_amount column to track cumulative partial payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;

-- Update existing paid payments to have paid_amount = amount
UPDATE public.payments SET paid_amount = amount WHERE status = 'paid' AND (paid_amount IS NULL OR paid_amount = 0);
