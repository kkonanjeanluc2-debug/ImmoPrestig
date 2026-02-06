-- Add settings-related permissions to member_permissions table
ALTER TABLE public.member_permissions
ADD COLUMN IF NOT EXISTS can_access_settings boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_team boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_automations boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_branding boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_templates boolean NOT NULL DEFAULT false;