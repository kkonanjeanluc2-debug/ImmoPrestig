
-- Add RLS policies for super_admin to view all data

-- Properties: Allow super_admin to view all properties
CREATE POLICY "Super admins can view all properties" 
ON public.properties 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Tenants: Allow super_admin to view all tenants
CREATE POLICY "Super admins can view all tenants" 
ON public.tenants 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Owners: Allow super_admin to view all owners
CREATE POLICY "Super admins can view all owners" 
ON public.owners 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Lotissements: Allow super_admin to view all lotissements
CREATE POLICY "Super admins can view all lotissements" 
ON public.lotissements 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Payments: Allow super_admin to view all payments
CREATE POLICY "Super admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (is_super_admin(auth.uid()));
