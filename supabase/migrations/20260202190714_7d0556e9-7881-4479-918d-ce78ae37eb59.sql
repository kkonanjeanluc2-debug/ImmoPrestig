
-- Allow super_admin to view all ventes_immobilieres
CREATE POLICY "Super admins can view all ventes_immobilieres" 
ON public.ventes_immobilieres 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Also add for biens_vente (properties for sale)
CREATE POLICY "Super admins can view all biens_vente" 
ON public.biens_vente 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- And echeances_ventes (sale installments)
CREATE POLICY "Super admins can view all echeances_ventes" 
ON public.echeances_ventes 
FOR SELECT 
USING (is_super_admin(auth.uid()));
