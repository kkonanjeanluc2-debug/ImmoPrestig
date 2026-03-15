
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_quarterly integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_semi_annual integer NOT NULL DEFAULT 0;

-- Update existing plans: calculate quarterly as 3x monthly, semi-annual as 6x monthly (no discount by default)
UPDATE public.subscription_plans 
SET price_quarterly = price_monthly * 3,
    price_semi_annual = price_monthly * 6;
