ALTER TABLE public.member_permissions
ADD COLUMN IF NOT EXISTS can_delete_invoices boolean NOT NULL DEFAULT true;