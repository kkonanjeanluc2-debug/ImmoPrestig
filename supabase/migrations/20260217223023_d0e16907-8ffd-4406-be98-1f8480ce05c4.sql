
-- Add GeniusPay as a payment provider
INSERT INTO public.payment_provider_configs (provider_name, display_name, is_enabled, is_sandbox, api_key_configured, supported_methods, settings)
VALUES (
  'geniuspay',
  'GeniusPay',
  false,
  true,
  false,
  ARRAY['wave', 'orange_money', 'mtn_money', 'card'],
  '{"description": "Agrégateur de paiement unifié pour l''Afrique (Wave, Orange Money, MTN, Carte)"}'::jsonb
)
ON CONFLICT DO NOTHING;
