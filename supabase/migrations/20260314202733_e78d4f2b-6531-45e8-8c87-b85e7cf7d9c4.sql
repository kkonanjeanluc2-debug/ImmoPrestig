ALTER TABLE public.member_permissions 
  ADD COLUMN IF NOT EXISTS can_view_comptabilite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export_comptabilite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_expenses boolean NOT NULL DEFAULT false;