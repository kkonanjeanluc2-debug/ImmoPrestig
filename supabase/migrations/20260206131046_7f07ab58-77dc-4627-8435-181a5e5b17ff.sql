-- Create a table for member custom permissions
CREATE TABLE public.member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.agency_members(id) ON DELETE CASCADE NOT NULL,
  -- Property management
  can_view_properties boolean NOT NULL DEFAULT true,
  can_create_properties boolean NOT NULL DEFAULT false,
  can_edit_properties boolean NOT NULL DEFAULT false,
  can_delete_properties boolean NOT NULL DEFAULT false,
  -- Tenant management
  can_view_tenants boolean NOT NULL DEFAULT true,
  can_create_tenants boolean NOT NULL DEFAULT false,
  can_edit_tenants boolean NOT NULL DEFAULT false,
  can_delete_tenants boolean NOT NULL DEFAULT false,
  -- Payment management
  can_view_payments boolean NOT NULL DEFAULT true,
  can_create_payments boolean NOT NULL DEFAULT false,
  can_edit_payments boolean NOT NULL DEFAULT false,
  can_delete_payments boolean NOT NULL DEFAULT false,
  -- Owner management
  can_view_owners boolean NOT NULL DEFAULT true,
  can_create_owners boolean NOT NULL DEFAULT false,
  can_edit_owners boolean NOT NULL DEFAULT false,
  can_delete_owners boolean NOT NULL DEFAULT false,
  -- Contract management
  can_view_contracts boolean NOT NULL DEFAULT true,
  can_create_contracts boolean NOT NULL DEFAULT false,
  can_edit_contracts boolean NOT NULL DEFAULT false,
  can_delete_contracts boolean NOT NULL DEFAULT false,
  -- Lotissement management
  can_view_lotissements boolean NOT NULL DEFAULT true,
  can_create_lotissements boolean NOT NULL DEFAULT false,
  can_edit_lotissements boolean NOT NULL DEFAULT false,
  can_delete_lotissements boolean NOT NULL DEFAULT false,
  -- Ventes immobilieres management
  can_view_ventes boolean NOT NULL DEFAULT true,
  can_create_ventes boolean NOT NULL DEFAULT false,
  can_edit_ventes boolean NOT NULL DEFAULT false,
  can_delete_ventes boolean NOT NULL DEFAULT false,
  -- Documents
  can_view_documents boolean NOT NULL DEFAULT true,
  can_create_documents boolean NOT NULL DEFAULT false,
  can_delete_documents boolean NOT NULL DEFAULT false,
  -- Reports & settings
  can_view_reports boolean NOT NULL DEFAULT false,
  can_export_data boolean NOT NULL DEFAULT false,
  can_send_reminders boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(member_id)
);

-- Enable RLS
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Agency owners can manage permissions
CREATE POLICY "Agency owners can view member permissions"
ON public.member_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.id = member_permissions.member_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agency owners can insert member permissions"
ON public.member_permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.id = member_permissions.member_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agency owners can update member permissions"
ON public.member_permissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.id = member_permissions.member_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Agency owners can delete member permissions"
ON public.member_permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.id = member_permissions.member_id
    AND a.user_id = auth.uid()
  )
);

-- Members can view their own permissions
CREATE POLICY "Members can view their own permissions"
ON public.member_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.id = member_permissions.member_id
    AND am.user_id = auth.uid()
  )
);

-- Super admins can manage all permissions
CREATE POLICY "Super admins can manage all permissions"
ON public.member_permissions
FOR ALL
USING (is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_member_permissions_updated_at
  BEFORE UPDATE ON public.member_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();