-- Insert the yearly discount percentage platform setting if it doesn't exist
INSERT INTO public.platform_settings (key, value, description)
VALUES ('yearly_discount_percentage', '20', 'Pourcentage de réduction affiché pour les abonnements annuels')
ON CONFLICT (key) DO NOTHING;