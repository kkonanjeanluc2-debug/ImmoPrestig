-- Create a trigger function to automatically create a free subscription for new agencies
CREATE OR REPLACE FUNCTION public.handle_new_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  free_plan_id UUID := '43d89303-1bc8-4aa8-94e0-76de7d6c2c98';
BEGIN
  -- Insert a free subscription for the new agency
  INSERT INTO public.agency_subscriptions (agency_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, free_plan_id, 'active', 'monthly')
  ON CONFLICT (agency_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on agencies table
DROP TRIGGER IF EXISTS on_agency_created_subscription ON public.agencies;
CREATE TRIGGER on_agency_created_subscription
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_agency_subscription();