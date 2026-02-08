-- Drop the existing check constraint and add a new one that includes 'lifetime'
ALTER TABLE public.agency_subscriptions 
DROP CONSTRAINT IF EXISTS agency_subscriptions_billing_cycle_check;

ALTER TABLE public.agency_subscriptions 
ADD CONSTRAINT agency_subscriptions_billing_cycle_check 
CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime'));