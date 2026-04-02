ALTER TABLE public.tenants
ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_tenant_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND btrim(NEW.email) = '' THEN
    NEW.email := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_tenant_email_before_write ON public.tenants;

CREATE TRIGGER normalize_tenant_email_before_write
BEFORE INSERT OR UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.normalize_tenant_email();