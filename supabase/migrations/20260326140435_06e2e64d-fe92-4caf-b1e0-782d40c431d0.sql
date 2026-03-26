
-- Deactivate the free plan
UPDATE public.subscription_plans SET is_active = false WHERE id = '43d89303-1bc8-4aa8-94e0-76de7d6c2c98';

-- Update trigger to assign Pro plan as 30-day trial for new agencies
CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pro_plan_id UUID := '5e66e9ad-56d6-4242-8d7b-769f28a1d803';
  trial_end TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle, trial_ends_at, ends_at)
  VALUES (NEW.id, pro_plan_id, 'trial', 'monthly', trial_end, trial_end)
  ON CONFLICT (agency_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
