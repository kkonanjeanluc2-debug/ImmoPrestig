
ALTER TABLE public.owners ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_owner_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND btrim(NEW.email) = '' THEN
    NEW.email := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_owner_email_trigger
  BEFORE INSERT OR UPDATE ON public.owners
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_owner_email();
