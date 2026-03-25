
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_view_echeances_lotissements boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_collect_echeances_lotissements boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_echeances_ventes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_collect_echeances_ventes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_echeances_achats boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_collect_echeances_achats boolean NOT NULL DEFAULT true;
