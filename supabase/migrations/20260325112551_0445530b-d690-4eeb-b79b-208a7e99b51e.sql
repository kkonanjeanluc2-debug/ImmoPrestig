ALTER TABLE public.member_permissions 
  ADD COLUMN IF NOT EXISTS can_export_guide boolean NOT NULL DEFAULT true;