-- Renforcement des policies user_roles : empêcher auto-assignation et escalade super_admin

-- 1. Supprimer les anciennes policies admin
DROP POLICY IF EXISTS "Admins can insert non super-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update non super-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete non super-admin roles" ON public.user_roles;

-- 2. Recréer avec contraintes durcies
-- INSERT : admin ne peut PAS insérer de super_admin, ni s'auto-assigner un rôle
CREATE POLICY "Admins can insert non super-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id <> auth.uid()
);

-- UPDATE : admin ne peut pas toucher une ligne super_admin, ne peut pas créer un super_admin,
-- et ne peut pas modifier son propre rôle (anti auto-escalade)
CREATE POLICY "Admins can update non super-admin roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id <> auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id <> auth.uid()
);

-- DELETE : admin ne peut pas supprimer un super_admin, ni se supprimer lui-même
CREATE POLICY "Admins can delete non super-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id <> auth.uid()
);

-- 3. Renforcer la policy super_admin UPDATE avec WITH CHECK explicite
DROP POLICY IF EXISTS "Super admins can update all user roles" ON public.user_roles;
CREATE POLICY "Super admins can update all user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 4. Trigger défense en profondeur : bloquer toute tentative d'escalade super_admin
-- par un utilisateur qui n'est pas déjà super_admin (ceinture + bretelles vs RLS)
CREATE OR REPLACE FUNCTION public.prevent_super_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  -- Service role / système : autoriser
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloquer toute création/modification vers super_admin par un non super_admin
  IF NEW.role = 'super_admin'::app_role AND NOT public.is_super_admin(v_actor) THEN
    RAISE EXCEPTION 'Escalade de privilèges interdite : seul un super_admin peut attribuer le rôle super_admin'
      USING ERRCODE = '42501';
  END IF;

  -- Empêcher l'auto-attribution / auto-modification de rôle (sauf super_admin agissant sur autrui)
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND NEW.user_id = v_actor
     AND NOT public.is_super_admin(v_actor) THEN
    RAISE EXCEPTION 'Auto-attribution de rôle interdite : un utilisateur ne peut pas modifier son propre rôle'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_super_admin_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_super_admin_escalation_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_super_admin_escalation();