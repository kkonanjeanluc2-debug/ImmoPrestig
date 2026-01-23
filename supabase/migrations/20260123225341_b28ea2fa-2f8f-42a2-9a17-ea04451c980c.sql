
-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  max_properties integer,
  max_tenants integer,
  max_users integer DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create agency subscriptions table
CREATE TABLE public.agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (read by all, managed by super_admin)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert subscription plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update subscription plans"
ON public.subscription_plans
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete subscription plans"
ON public.subscription_plans
FOR DELETE
USING (is_super_admin(auth.uid()));

-- RLS policies for agency_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.agency_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agencies 
    WHERE agencies.id = agency_subscriptions.agency_id 
    AND agencies.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all subscriptions"
ON public.agency_subscriptions
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert subscriptions"
ON public.agency_subscriptions
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update subscriptions"
ON public.agency_subscriptions
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete subscriptions"
ON public.agency_subscriptions
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Insert default plans for Ivory Coast market
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_properties, max_tenants, max_users, features, is_popular, display_order) VALUES
('Gratuit', 'Idéal pour démarrer', 0, 0, 5, 10, 1, '["Gestion de 5 biens", "10 locataires max", "Quittances PDF", "Support email"]'::jsonb, false, 1),
('Starter', 'Pour les petits propriétaires', 9900, 99000, 15, 30, 2, '["Gestion de 15 biens", "30 locataires max", "2 utilisateurs", "Quittances PDF", "Rappels automatiques", "Support prioritaire"]'::jsonb, false, 2),
('Pro', 'Pour les agences en croissance', 24900, 249000, 50, 100, 5, '["Gestion de 50 biens", "100 locataires max", "5 utilisateurs", "Quittances personnalisées", "Rappels SMS & Email", "Rapports avancés", "Support prioritaire"]'::jsonb, true, 3),
('Enterprise', 'Pour les grandes agences', 49900, 499000, NULL, NULL, NULL, '["Biens illimités", "Locataires illimités", "Utilisateurs illimités", "Toutes les fonctionnalités", "API access", "Support dédié", "Formation personnalisée"]'::jsonb, false, 4);

-- Update trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_subscriptions_updated_at
BEFORE UPDATE ON public.agency_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
