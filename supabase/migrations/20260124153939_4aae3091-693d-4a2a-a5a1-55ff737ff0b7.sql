-- Add assigned_to column to properties
ALTER TABLE public.properties
ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_to column to tenants  
ALTER TABLE public.tenants
ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_properties_assigned_to ON public.properties(assigned_to);
CREATE INDEX idx_tenants_assigned_to ON public.tenants(assigned_to);

-- Function to check if user is agency owner or admin
CREATE OR REPLACE FUNCTION public.is_agency_owner_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User owns an agency
    SELECT 1 FROM public.agencies WHERE user_id = _user_id
  ) OR EXISTS (
    -- User is an admin member of an agency
    SELECT 1 FROM public.agency_members 
    WHERE user_id = _user_id 
    AND role = 'admin'::app_role 
    AND status = 'active'
  )
$$;

-- Function to get the agency_id for a user (owner or member)
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- If user owns an agency
    (SELECT id FROM public.agencies WHERE user_id = _user_id LIMIT 1),
    -- If user is a member of an agency
    (SELECT agency_id FROM public.agency_members WHERE user_id = _user_id AND status = 'active' LIMIT 1)
  )
$$;

-- Function to check if user can access a property
CREATE OR REPLACE FUNCTION public.can_access_property(_user_id UUID, _property_user_id UUID, _assigned_to UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the property owner (agency owner)
    _user_id = _property_user_id
    OR
    -- User is assigned to this property
    _user_id = _assigned_to
    OR
    -- User is admin/owner of the agency that owns this property
    EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _property_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR
    -- User is a gestionnaire with no specific assignment (can see unassigned)
    (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _property_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$$;

-- Drop existing policies on properties
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

-- New policies for properties with assignment filtering
CREATE POLICY "Users can view accessible properties"
ON public.properties
FOR SELECT
USING (
  public.can_access_property(auth.uid(), user_id, assigned_to)
);

CREATE POLICY "Agency owners can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agency owners and admins can update properties"
ON public.properties
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = properties.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

CREATE POLICY "Agency owners can delete properties"
ON public.properties
FOR DELETE
USING (auth.uid() = user_id);

-- Similar function for tenants
CREATE OR REPLACE FUNCTION public.can_access_tenant(_user_id UUID, _tenant_user_id UUID, _assigned_to UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _tenant_user_id
    OR _user_id = _assigned_to
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = _tenant_user_id
      AND am.user_id = _user_id
      AND am.role = 'admin'::app_role
      AND am.status = 'active'
    )
    OR (
      _assigned_to IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        JOIN public.agency_members am ON am.agency_id = a.id
        WHERE a.user_id = _tenant_user_id
        AND am.user_id = _user_id
        AND am.status = 'active'
      )
    )
$$;

-- Drop existing policies on tenants
DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete their own tenants" ON public.tenants;

-- New policies for tenants with assignment filtering
CREATE POLICY "Users can view accessible tenants"
ON public.tenants
FOR SELECT
USING (
  public.can_access_tenant(auth.uid(), user_id, assigned_to)
);

CREATE POLICY "Agency owners can insert tenants"
ON public.tenants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agency owners and admins can update tenants"
ON public.tenants
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    JOIN public.agency_members am ON am.agency_id = a.id
    WHERE a.user_id = tenants.user_id
    AND am.user_id = auth.uid()
    AND am.role = 'admin'::app_role
    AND am.status = 'active'
  )
);

CREATE POLICY "Agency owners can delete tenants"
ON public.tenants
FOR DELETE
USING (auth.uid() = user_id);