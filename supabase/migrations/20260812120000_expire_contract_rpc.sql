-- Fix: résilier un contrat laissait le bien "loué" pour les rôles qui peuvent
-- mettre à jour un contrat (agence membre via can_access_contract_via_property,
-- ex: caissière/comptable) mais qui n'ont pas le droit RLS de modifier
-- properties/property_units (limité à owner/admin/gestionnaire assigné).
-- Le contrat passait bien à "expired" (RLS contracts plus permissive) mais la
-- mise à jour du bien/unité vers "disponible" était silencieusement bloquée.
--
-- On déplace toute la transaction dans une fonction SECURITY DEFINER, avec sa
-- propre vérification d'autorisation basée sur can_access_contract_via_property
-- (la même utilisée par la policy RLS "Users can update accessible contracts"),
-- pour que quiconque peut résilier le contrat puisse aussi libérer le bien.

CREATE OR REPLACE FUNCTION public.expire_contract(
  _contract_id uuid,
  _property_id uuid,
  _unit_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract_user_id uuid;
  _tenant_id uuid;
  _authorized boolean;
  _occupied_units integer;
BEGIN
  SELECT user_id, tenant_id INTO _contract_user_id, _tenant_id
  FROM public.contracts
  WHERE id = _contract_id AND property_id = _property_id;

  IF _contract_user_id IS NULL THEN
    RAISE EXCEPTION 'Contrat introuvable';
  END IF;

  SELECT (
    auth.uid() = _contract_user_id
    OR public.can_access_contract_via_property(auth.uid(), _property_id)
  ) INTO _authorized;

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Non autorisé à résilier ce contrat';
  END IF;

  UPDATE public.contracts
  SET status = 'expired'
  WHERE id = _contract_id;

  IF _tenant_id IS NOT NULL THEN
    UPDATE public.tenants
    SET status = 'ancien'
    WHERE id = _tenant_id;
  END IF;

  IF _unit_id IS NOT NULL THEN
    UPDATE public.property_units
    SET status = 'disponible'
    WHERE id = _unit_id;

    SELECT COUNT(*) INTO _occupied_units
    FROM public.property_units
    WHERE property_id = _property_id AND status = 'loué';

    IF _occupied_units = 0 THEN
      UPDATE public.properties
      SET status = 'disponible'
      WHERE id = _property_id;
    END IF;
  ELSE
    UPDATE public.properties
    SET status = 'disponible'
    WHERE id = _property_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_contract(uuid, uuid, uuid) TO authenticated;
