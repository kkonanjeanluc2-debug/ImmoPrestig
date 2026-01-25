-- Function to update property price based on sum of unit rents
CREATE OR REPLACE FUNCTION public.sync_property_price_from_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_rent NUMERIC;
  target_property_id UUID;
BEGIN
  -- Determine which property to update
  IF TG_OP = 'DELETE' THEN
    target_property_id := OLD.property_id;
  ELSE
    target_property_id := NEW.property_id;
  END IF;

  -- Calculate sum of all unit rents for this property
  SELECT COALESCE(SUM(rent_amount), 0)
  INTO total_rent
  FROM public.property_units
  WHERE property_id = target_property_id;

  -- Update the property price only if there are units
  -- If no units, keep the original price
  IF total_rent > 0 THEN
    UPDATE public.properties
    SET price = total_rent, updated_at = now()
    WHERE id = target_property_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger for INSERT on property_units
CREATE TRIGGER trigger_sync_property_price_on_insert
AFTER INSERT ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.sync_property_price_from_units();

-- Trigger for UPDATE on property_units (when rent_amount changes)
CREATE TRIGGER trigger_sync_property_price_on_update
AFTER UPDATE OF rent_amount ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.sync_property_price_from_units();

-- Trigger for DELETE on property_units
CREATE TRIGGER trigger_sync_property_price_on_delete
AFTER DELETE ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.sync_property_price_from_units();