
-- Add Achats Immobiliers permissions
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_view_achats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_achats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_achats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_achats boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_offres_achat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_achats_documents boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_mutations boolean NOT NULL DEFAULT false;

-- Add Impayés permissions
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_view_impayes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_impayes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_impayes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_impayes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_impayes_actions boolean NOT NULL DEFAULT false;
