-- Create platform_settings table for global configuration
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings (for public features like demo button)
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only super admins can modify settings
CREATE POLICY "Super admins can insert platform settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete platform settings"
ON public.platform_settings
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default WhatsApp demo number
INSERT INTO public.platform_settings (key, value, description)
VALUES ('whatsapp_demo_number', '', 'Numéro WhatsApp pour les demandes de démo');