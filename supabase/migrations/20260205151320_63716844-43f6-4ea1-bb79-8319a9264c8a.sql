-- Insert PawaPay as a new payment provider
INSERT INTO public.payment_provider_configs (
  provider_name,
  display_name,
  is_enabled,
  is_sandbox,
  api_key_configured,
  webhook_url,
  settings,
  supported_methods
) VALUES (
  'pawapay',
  'PawaPay',
  false,
  true,
  false,
  NULL,
  jsonb_build_object(
    'description', 'Plateforme panafricaine de paiement Mobile Money',
    'public_key_configured', false,
    'secret_key_configured', false
  ),
  ARRAY['mtn_money', 'orange_money', 'moov', 'airtel']::text[]
) ON CONFLICT (provider_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  supported_methods = EXCLUDED.supported_methods,
  settings = payment_provider_configs.settings || EXCLUDED.settings;