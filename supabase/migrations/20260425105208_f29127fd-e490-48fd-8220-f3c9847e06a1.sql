CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  premium_plan_id UUID := 'de1f2bbe-0300-43a8-9c06-28dfb8d8252a';
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

  -- Pendant la période d'essai, TOUS les nouveaux inscrits (agences et propriétaires)
  -- bénéficient du forfait Premium qui débloque toutes les fonctionnalités.
  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle, trial_ends_at, ends_at)
  VALUES (NEW.id, premium_plan_id, 'trial', 'monthly', v_trial_end, v_trial_end)
  ON CONFLICT (agency_id) DO NOTHING;

  RETURN NEW;
END;
$function$;