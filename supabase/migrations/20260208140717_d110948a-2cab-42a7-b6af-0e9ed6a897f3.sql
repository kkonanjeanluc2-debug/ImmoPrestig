-- Add new permission columns for biens_vente and vente_prospects management
ALTER TABLE public.member_permissions 
ADD COLUMN IF NOT EXISTS can_create_biens_vente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_biens_vente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_vente_prospects boolean DEFAULT false;