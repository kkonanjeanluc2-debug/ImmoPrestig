-- Add columns to track which months are being paid
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_months text[] DEFAULT NULL;

-- Create a unique constraint to prevent duplicate payments for the same tenant/month/year
-- We'll use a function-based constraint for this
CREATE OR REPLACE FUNCTION check_duplicate_payment_months()
RETURNS TRIGGER AS $$
DECLARE
  existing_month text;
  new_month text;
BEGIN
  -- Only check if payment_months is not null and not empty
  IF NEW.payment_months IS NOT NULL AND array_length(NEW.payment_months, 1) > 0 THEN
    -- Check each month in the new payment
    FOREACH new_month IN ARRAY NEW.payment_months
    LOOP
      -- Check if this month already exists for this tenant (excluding the current payment if updating)
      SELECT pm.month INTO existing_month
      FROM payments p, unnest(p.payment_months) AS pm(month)
      WHERE p.tenant_id = NEW.tenant_id
        AND p.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND p.status != 'cancelled'
        AND pm.month = new_month
      LIMIT 1;
      
      IF existing_month IS NOT NULL THEN
        RAISE EXCEPTION 'Le mois % a déjà été payé pour ce locataire', new_month;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS check_duplicate_payment_months_trigger ON payments;
CREATE TRIGGER check_duplicate_payment_months_trigger
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_payment_months();