-- Create is_super_admin function that checks the role directly
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::app_role
  )
$$;

-- Add RLS policies for super_admin to view all agencies
CREATE POLICY "Super admins can view all agencies"
ON public.agencies
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all agencies"
ON public.agencies
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete agencies"
ON public.agencies
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Add RLS policies for super_admin to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policies for super_admin to view all user_roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.is_super_admin(auth.uid()));