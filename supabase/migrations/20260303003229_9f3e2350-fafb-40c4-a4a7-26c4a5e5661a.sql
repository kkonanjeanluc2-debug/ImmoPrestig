
-- Add individual settings tab permissions
ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS can_access_agency_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_management_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_subscription_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_notifications_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_whatsapp_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_sale_contracts_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_promesse_vente_tab boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_access_reservation_forms_tab boolean NOT NULL DEFAULT false;

-- Migrate existing can_access_settings values to individual tabs
UPDATE public.member_permissions
SET
  can_access_agency_tab = can_access_settings,
  can_access_management_tab = can_access_settings,
  can_access_subscription_tab = can_access_settings,
  can_access_notifications_tab = can_access_settings,
  can_access_whatsapp_tab = can_access_settings,
  can_access_sale_contracts_tab = can_access_settings,
  can_access_promesse_vente_tab = can_access_settings,
  can_access_reservation_forms_tab = can_access_settings;
