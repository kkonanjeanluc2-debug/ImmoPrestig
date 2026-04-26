-- Trigger: créer une notification pour le locataire lorsqu'une réponse est apportée à sa requête
CREATE OR REPLACE FUNCTION public.notify_tenant_on_request_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal_user_id uuid;
  v_response_added boolean;
BEGIN
  -- Détecte si une réponse a été ajoutée ou modifiée
  v_response_added := (
    NEW.admin_response IS NOT NULL
    AND NEW.admin_response <> ''
    AND (
      OLD.admin_response IS DISTINCT FROM NEW.admin_response
      OR OLD.responded_at IS DISTINCT FROM NEW.responded_at
    )
  );

  IF NOT v_response_added THEN
    RETURN NEW;
  END IF;

  -- Récupère le portal_user_id du locataire
  SELECT portal_user_id INTO v_portal_user_id
  FROM public.tenants
  WHERE id = NEW.tenant_id
    AND has_portal_access = true
    AND portal_user_id IS NOT NULL
  LIMIT 1;

  IF v_portal_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, read)
  VALUES (
    v_portal_user_id,
    'Réponse de votre agence',
    'Votre agence a répondu à votre requête : ' || COALESCE(NEW.title, ''),
    'info',
    'tenant_request',
    NEW.id,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_tenant_on_request_response ON public.tenant_requests;

CREATE TRIGGER trg_notify_tenant_on_request_response
AFTER UPDATE ON public.tenant_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_tenant_on_request_response();