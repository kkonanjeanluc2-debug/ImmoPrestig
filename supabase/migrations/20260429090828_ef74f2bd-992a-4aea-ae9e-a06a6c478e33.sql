ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS grace_period_days_prepaid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grace_period_days_postpaid integer NOT NULL DEFAULT 0;