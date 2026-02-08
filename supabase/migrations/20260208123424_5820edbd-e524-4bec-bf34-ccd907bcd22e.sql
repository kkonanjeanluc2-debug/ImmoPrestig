-- Add granular permissions for Lotissement module sub-entities
ALTER TABLE public.member_permissions
ADD COLUMN IF NOT EXISTS can_create_parcelles BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_ilots BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_lotissement_documents BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_demarches BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_lotissement_prospects BOOLEAN DEFAULT false;