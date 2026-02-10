
-- Add email_provider setting (resend or maileroo)
INSERT INTO public.platform_settings (key, value, description)
VALUES ('email_provider', 'resend', 'Fournisseur d''emails actif: resend ou maileroo')
ON CONFLICT (key) DO NOTHING;

-- Add maileroo_email_enabled setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('maileroo_email_enabled', 'true', 'Activer ou désactiver l''envoi d''emails via Maileroo')
ON CONFLICT (key) DO NOTHING;
