ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS payment_timing TEXT NOT NULL DEFAULT 'prepaid'
CHECK (payment_timing IN ('prepaid', 'postpaid'));

COMMENT ON COLUMN public.tenants.payment_timing IS 'prepaid: pays rent before consuming the month (default). postpaid: pays at end of month after consuming.';