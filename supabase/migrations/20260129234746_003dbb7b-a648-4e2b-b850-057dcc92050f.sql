-- Fix: New users who create their own agency should be admin by default
-- Team members added via edge function will have their role set explicitly

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- New users become admin by default (agency owners)
  -- Team members added via create-agency-member edge function will have their role updated
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;