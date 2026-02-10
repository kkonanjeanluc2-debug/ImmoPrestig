
INSERT INTO public.platform_settings (key, value, description)
VALUES ('resend_email_enabled', 'true', 'Activer ou désactiver l''envoi d''emails via Resend pour toute la plateforme')
ON CONFLICT (key) DO NOTHING;
