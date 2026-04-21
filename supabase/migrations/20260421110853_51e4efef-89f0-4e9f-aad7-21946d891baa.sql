-- Sécurisation des canaux Realtime : un utilisateur ne peut écouter
-- que les canaux liés à son agence ou à son propre user_id / tenant.
-- Convention de nommage des canaux côté client :
--   agency:<agency_id>           -> tous les membres actifs de l'agence
--   agency:<agency_id>:<topic>   -> idem, sous-topic libre
--   user:<user_id>               -> uniquement cet utilisateur
--   user:<user_id>:<topic>       -> idem, sous-topic libre
--   tenant:<tenant_portal_user>  -> uniquement le locataire concerné
--   public:*                     -> canaux publics (read-only broadcast)

-- 1. Fonction utilitaire SECURITY DEFINER qui valide l'accès à un topic
CREATE OR REPLACE FUNCTION public.can_subscribe_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_kind text;
  v_id_text text;
  v_id uuid;
  v_user_agency uuid;
BEGIN
  -- Anonyme : aucun accès
  IF v_user IS NULL OR _topic IS NULL OR length(_topic) = 0 THEN
    RETURN false;
  END IF;

  -- Super admin : accès total
  IF public.is_super_admin(v_user) THEN
    RETURN true;
  END IF;

  -- Canaux publics en lecture seule (broadcast) : autorisés
  IF _topic LIKE 'public:%' THEN
    RETURN true;
  END IF;

  -- Extraire le préfixe (kind) et l'identifiant
  v_kind := split_part(_topic, ':', 1);
  v_id_text := split_part(_topic, ':', 2);

  IF v_kind = '' OR v_id_text = '' THEN
    RETURN false;
  END IF;

  -- Tentative de cast en uuid (les topics doivent contenir un uuid valide)
  BEGIN
    v_id := v_id_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Canal user:<uuid> : uniquement le user lui-même
  IF v_kind = 'user' THEN
    RETURN v_id = v_user;
  END IF;

  -- Canal tenant:<portal_user_id> : uniquement le locataire concerné
  IF v_kind = 'tenant' THEN
    RETURN v_id = v_user;
  END IF;

  -- Canal agency:<agency_id> : membre actif ou propriétaire de l'agence
  IF v_kind = 'agency' THEN
    v_user_agency := public.get_user_agency_id(v_user);
    RETURN v_user_agency IS NOT NULL AND v_user_agency = v_id;
  END IF;

  -- Tout autre préfixe : refusé par défaut (deny-by-default)
  RETURN false;
END;
$$;

-- Permettre l'exécution par les rôles authentifiés
GRANT EXECUTE ON FUNCTION public.can_subscribe_realtime_topic(text) TO authenticated, anon;

-- 2. Activer la RLS sur realtime.messages (sécurité par défaut)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Authenticated users can subscribe to allowed topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can broadcast on allowed topics" ON realtime.messages;
DROP POLICY IF EXISTS "Anon cannot access realtime" ON realtime.messages;

-- 4. SELECT : recevoir des messages uniquement sur des canaux autorisés
CREATE POLICY "Authenticated users can subscribe to allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_subscribe_realtime_topic(realtime.topic()));

-- 5. INSERT : envoyer (broadcast / presence) uniquement sur des canaux autorisés
CREATE POLICY "Authenticated users can broadcast on allowed topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_subscribe_realtime_topic(realtime.topic()));

-- 6. Bloquer explicitement les utilisateurs anonymes
CREATE POLICY "Anon cannot access realtime"
ON realtime.messages
FOR SELECT
TO anon
USING (false);
