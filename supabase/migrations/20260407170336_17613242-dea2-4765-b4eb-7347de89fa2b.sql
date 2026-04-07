ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_view_apporteurs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_apporteurs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_apporteurs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_apporteurs boolean NOT NULL DEFAULT false;