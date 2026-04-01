
ALTER TABLE public.member_permissions 
  ADD COLUMN IF NOT EXISTS can_cancel_vente_parcelle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_mutations_parcelle boolean NOT NULL DEFAULT false;
