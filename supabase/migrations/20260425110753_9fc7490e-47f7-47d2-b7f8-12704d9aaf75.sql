-- 1. Améliorer handle_new_user pour créer aussi l'agence automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_agency_name text;
  v_phone text;
  v_address text;
  v_city text;
  v_country text;
  v_siret text;
  v_account_type text;
  v_slug text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_agency_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'agency_name'), ''),
    NULLIF(btrim(v_full_name), ''),
    split_part(NEW.email, '@', 1)
  );
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  v_address := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'address', '')), '');
  v_city := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');
  v_country := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'country'), ''), 'Côte d''Ivoire');
  v_siret := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'siret', '')), '');
  v_account_type := COALESCE(NULLIF(NEW.raw_user_meta_data->>'account_type', ''), 'agence');

  -- Crée le profil
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  -- Tentative de création de l'agence/propriétaire si pas déjà créée côté client
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE user_id = NEW.id) THEN
    -- Slug basé sur le nom + suffixe court de l'uuid pour l'unicité
    v_slug := lower(regexp_replace(v_agency_name, '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substring(NEW.id::text, 1, 8);
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');

    BEGIN
      INSERT INTO public.agencies (
        user_id, account_type, name, slug, email, phone,
        address, city, country, siret
      ) VALUES (
        NEW.id, v_account_type, v_agency_name, v_slug, NEW.email, v_phone,
        v_address, v_city, v_country, v_siret
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ne bloque pas la création de l'utilisateur si l'agence ne peut pas être créée
      RAISE WARNING 'Could not auto-create agency for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill: créer les fiches agence manquantes pour les utilisateurs existants
INSERT INTO public.agencies (user_id, account_type, name, slug, email, phone, country)
SELECT 
  p.user_id,
  'agence',
  COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)) AS name,
  lower(regexp_replace(
    COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  )) || '-' || substring(p.user_id::text, 1, 8) AS slug,
  p.email,
  '',
  'Côte d''Ivoire'
FROM public.profiles p
LEFT JOIN public.agencies a ON a.user_id = p.user_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE a.id IS NULL
  -- Exclure les locataires (portail) et super admins
  AND p.email NOT LIKE '%@tenant.immoprestige.local'
  AND (ur.role IS NULL OR ur.role NOT IN ('super_admin'))
ON CONFLICT (user_id) DO NOTHING;