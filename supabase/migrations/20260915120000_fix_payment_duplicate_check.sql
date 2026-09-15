-- Fix: check_duplicate_payment_months() only compared payment_months arrays,
-- so it did nothing when payment_months was NULL/empty (array_length of an
-- empty array is NULL, not 0, so the guard clause skipped the whole check).
-- Combined with a UI double-click race on "Encaisser" for auto-generated
-- (virtual) payments, this let two payment rows get created for the exact
-- same tenant + due_date — the "doublon" reported when collecting rent.
--
-- Adds a due_date-based guard that always applies (independent of
-- payment_months), on top of the existing per-month array guard.

CREATE OR REPLACE FUNCTION check_duplicate_payment_months()
RETURNS TRIGGER AS $$
DECLARE
  existing_month text;
  new_month text;
  existing_due_date_id uuid;
BEGIN
  -- Guard 1: same tenant + same due_date already has a non-cancelled payment.
  -- Catches duplicates even when payment_months is empty/null.
  IF NEW.tenant_id IS NOT NULL AND NEW.due_date IS NOT NULL THEN
    SELECT p.id INTO existing_due_date_id
    FROM payments p
    WHERE p.tenant_id = NEW.tenant_id
      AND p.due_date = NEW.due_date
      AND p.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND p.status != 'cancelled'
    LIMIT 1;

    IF existing_due_date_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un paiement a déjà été payé/enregistré pour ce locataire à cette échéance (%).', NEW.due_date;
    END IF;
  END IF;

  -- Guard 2 (existing): per-month array check.
  IF NEW.payment_months IS NOT NULL AND array_length(NEW.payment_months, 1) > 0 THEN
    FOREACH new_month IN ARRAY NEW.payment_months
    LOOP
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
