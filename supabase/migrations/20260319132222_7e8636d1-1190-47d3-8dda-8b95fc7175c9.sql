
-- Add receipt counter to agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS receipt_counter integer NOT NULL DEFAULT 0;

-- Add receipt number to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_number text;

-- Function to atomically get next receipt number for an agency
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_val integer;
BEGIN
  UPDATE public.agencies
  SET receipt_counter = receipt_counter + 1
  WHERE id = _agency_id
  RETURNING receipt_counter INTO next_val;
  
  RETURN LPAD(next_val::text, 5, '0');
END;
$$;
