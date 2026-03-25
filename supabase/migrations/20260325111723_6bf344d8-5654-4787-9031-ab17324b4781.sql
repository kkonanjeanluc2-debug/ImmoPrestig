-- Add new lotissement permission columns
ALTER TABLE public.member_permissions 
  ADD COLUMN IF NOT EXISTS can_access_guide boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_import_geometre boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_access_repartition boolean NOT NULL DEFAULT true;