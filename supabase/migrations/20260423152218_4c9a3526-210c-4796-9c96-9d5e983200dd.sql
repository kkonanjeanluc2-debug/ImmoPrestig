ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS login_image_url text;

UPDATE public.agencies
SET slug = lower(
  regexp_replace(
    regexp_replace(coalesce(name, 'agence'), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  )
)
WHERE slug IS NULL;

UPDATE public.agencies
SET slug = concat(slug, '-', substr(id::text, 1, 8))
WHERE slug IN (
  SELECT slug
  FROM public.agencies
  WHERE slug IS NOT NULL
  GROUP BY slug
  HAVING count(*) > 1
);

ALTER TABLE public.agencies
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_slug_key ON public.agencies (slug);

CREATE OR REPLACE FUNCTION public.get_agency_login_branding(_slug text)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  slug text,
  logo_url text,
  login_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.slug, a.logo_url, a.login_image_url
  FROM public.agencies a
  WHERE a.slug = _slug
    AND a.is_active = true
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_login_branding(text) TO anon, authenticated;