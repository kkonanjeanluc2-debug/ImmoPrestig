
CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  starter_plan_id UUID := '91fd1979-bcb7-437b-b87f-1d182550d2f4';
  premium_plan_id UUID := 'de1f2bbe-0300-43a8-9c06-28dfb8d8252a';
  selected_plan_id UUID;
  trial_end TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  -- Proprietaire accounts get Starter plan, others get Premium
  IF NEW.account_type = 'proprietaire' THEN
    selected_plan_id := starter_plan_id;
  ELSE
    selected_plan_id := premium_plan_id;
  END IF;

  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle, trial_ends_at, ends_at)
  VALUES (NEW.id, selected_plan_id, 'trial', 'monthly', trial_end, trial_end)
  ON CONFLICT (agency_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
