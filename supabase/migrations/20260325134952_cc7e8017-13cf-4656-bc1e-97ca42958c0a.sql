ALTER TABLE public.member_permissions
ADD COLUMN IF NOT EXISTS can_view_invoices boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create_invoices boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_owner_payouts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create_owner_payouts boolean NOT NULL DEFAULT true;