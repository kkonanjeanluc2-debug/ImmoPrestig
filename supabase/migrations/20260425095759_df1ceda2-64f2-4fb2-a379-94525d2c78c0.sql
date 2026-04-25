INSERT INTO public.platform_settings (key, value, description) VALUES ('trial_days_default', '30', 'Nombre de jours essai gratuit accordes a la creation dun nouveau compte') ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  starter_plan_id UUID := '5e66e9ad-56d6-4242-8d7b-769f28a1d803';
  premium_plan_id UUID := 'de1f2bbe-0300-43a8-9c06-28dfb8d8252a';
  selected_plan_id UUID;
  v_trial_days INTEGER;
  v_trial_end TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(NULLIF(value, '')::INTEGER, 30)
    INTO v_trial_days
  FROM public.platform_settings
  WHERE key = 'trial_days_default'
  LIMIT 1;

  IF v_trial_days IS NULL THEN
    v_trial_days := 30;
  END IF;

  v_trial_end := now() + make_interval(days => v_trial_days);

  IF NEW.account_type = 'proprietaire' THEN
    selected_plan_id := starter_plan_id;
  ELSE
    selected_plan_id := premium_plan_id;
  END IF;

  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle, trial_ends_at, ends_at)
  VALUES (NEW.id, selected_plan_id, 'trial', 'monthly', v_trial_end, v_trial_end)
  ON CONFLICT (agency_id) DO NOTHING;

  RETURN NEW;
END;
$func$;