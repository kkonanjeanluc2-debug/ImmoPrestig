
ALTER TABLE public.member_permissions
ADD COLUMN IF NOT EXISTS can_access_gestion_locative boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_crm_immobilier boolean NOT NULL DEFAULT true;
