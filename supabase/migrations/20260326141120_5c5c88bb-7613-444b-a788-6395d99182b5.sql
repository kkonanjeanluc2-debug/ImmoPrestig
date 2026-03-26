
CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  premium_plan_id UUID := 'de1f2bbe-0300-43a8-9c06-28dfb8d8252a';
  trial_end TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle, trial_ends_at, ends_at)
  VALUES (NEW.id, premium_plan_id, 'trial', 'monthly', trial_end, trial_end)
  ON CONFLICT (agency_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
