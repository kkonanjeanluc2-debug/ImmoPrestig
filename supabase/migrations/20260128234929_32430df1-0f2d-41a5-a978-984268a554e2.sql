-- Create table for payment provider configurations (super admin managed)
CREATE TABLE public.payment_provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  api_key_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  supported_methods TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_provider_configs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage payment provider configs
CREATE POLICY "Super admins can view payment providers"
ON public.payment_provider_configs
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert payment providers"
ON public.payment_provider_configs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update payment providers"
ON public.payment_provider_configs
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete payment providers"
ON public.payment_provider_configs
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Insert default provider configurations
INSERT INTO public.payment_provider_configs (provider_name, display_name, is_enabled, supported_methods, settings) VALUES
('fedapay', 'FedaPay', true, ARRAY['orange_money', 'mtn_money', 'wave', 'moov', 'card'], '{"description": "Paiement via FedaPay - Orange Money, MTN, Wave, Moov, Carte bancaire"}'::jsonb),
('wave_ci', 'Wave Côte d''Ivoire', false, ARRAY['wave_direct'], '{"description": "Paiement direct via l''API Wave CI", "api_base_url": "https://api.wave.com/v1"}'::jsonb);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_provider_configs_updated_at
BEFORE UPDATE ON public.payment_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();