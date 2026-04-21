
-- =========================================================
-- 1) Helper: check if a user has a granular role membership
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_role_in_agency(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id
      AND role = _role
      AND status = 'active'
  )
$$;

-- =========================================================
-- 2) HARDEN user_roles: only super_admin can assign super_admin
-- =========================================================
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert non super-admin roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
);

CREATE POLICY "Admins can update non super-admin roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
);

CREATE POLICY "Admins can delete non super-admin roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
);

-- =========================================================
-- 3) HARDEN payments DELETE: only owner/admin/super_admin
-- =========================================================
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;

CREATE POLICY "Owners and admins can delete payments"
ON public.payments
FOR DELETE
USING (
  -- Agency owner of the payment
  auth.uid() = user_id
  -- Or super_admin
  OR public.is_super_admin(auth.uid())
  -- Or admin member of the agency that owns this payment
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = payments.user_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
  )
);

-- =========================================================
-- 4) HARDEN payments UPDATE: caissiere & gestionnaire cannot edit
--    Only owner / admin / comptable / super_admin
-- =========================================================
DROP POLICY IF EXISTS "Users can update accessible payments" ON public.payments;

CREATE POLICY "Owners admins and comptables can update payments"
ON public.payments
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = payments.user_id
      AND am.user_id = auth.uid()
      AND am.role IN ('admin'::app_role, 'comptable'::app_role)
      AND am.status = 'active'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = payments.user_id
      AND am.user_id = auth.uid()
      AND am.role IN ('admin'::app_role, 'comptable'::app_role)
      AND am.status = 'active'
  )
);

-- =========================================================
-- 5) AUDIT TRIGGERS: log sensitive actions
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_sensitive_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_action text;
  v_entity_type text := TG_TABLE_NAME;
  v_entity_id uuid;
  v_entity_name text;
  v_details jsonb;
BEGIN
  IF v_actor IS NULL THEN
    -- Service role / system actions: skip logging
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_actor LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete_' || TG_TABLE_NAME;
    v_entity_id := OLD.id;
    v_details := jsonb_build_object(
      'actor_role', v_role,
      'deleted_row', to_jsonb(OLD)
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'insert_' || TG_TABLE_NAME;
    v_entity_id := NEW.id;
    v_details := jsonb_build_object(
      'actor_role', v_role,
      'new_row', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_' || TG_TABLE_NAME;
    v_entity_id := NEW.id;
    v_details := jsonb_build_object(
      'actor_role', v_role,
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
  END IF;

  -- Try to extract a friendly name when possible
  IF TG_TABLE_NAME = 'user_roles' THEN
    v_entity_name := COALESCE(NEW.role::text, OLD.role::text);
  END IF;

  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, entity_name, details
  ) VALUES (
    v_actor, v_action, v_entity_type, v_entity_id, v_entity_name, v_details
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers (drop first if rerun)
DROP TRIGGER IF EXISTS audit_payments_delete ON public.payments;
CREATE TRIGGER audit_payments_delete
AFTER DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_action();

DROP TRIGGER IF EXISTS audit_contracts_delete ON public.contracts;
CREATE TRIGGER audit_contracts_delete
AFTER DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_action();

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_action();

DROP TRIGGER IF EXISTS audit_agency_members_delete ON public.agency_members;
CREATE TRIGGER audit_agency_members_delete
AFTER DELETE ON public.agency_members
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_action();
