-- Update the check constraint to allow pending_payment status
ALTER TABLE public.agency_subscriptions DROP CONSTRAINT IF EXISTS agency_subscriptions_status_check;
ALTER TABLE public.agency_subscriptions ADD CONSTRAINT agency_subscriptions_status_check 
  CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'pending_payment'));

-- Update the trigger function to create pending_payment subscriptions instead of trial
CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_plan_id UUID := '5e66e9ad-56d6-4242-8d7b-769f28a1d803';
  premium_plan_id UUID := 'de1f2bbe-0300-43a8-9c06-28dfb8d8252a';
  selected_plan_id UUID;
BEGIN
  -- Proprietaire accounts get Starter plan, others get Premium
  IF NEW.account_type = 'proprietaire' THEN
    selected_plan_id := starter_plan_id;
  ELSE
    selected_plan_id := premium_plan_id;
  END IF;

  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, selected_plan_id, 'pending_payment', 'monthly')
  ON CONFLICT (agency_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;