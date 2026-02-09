
-- Allow gestionnaires to update parcelles they are assigned to
CREATE POLICY "Gestionnaires can update assigned parcelles"
ON public.parcelles
FOR UPDATE
USING (auth.uid() = assigned_to);

-- Create a trigger to automatically update parcelle status when a vente is created
CREATE OR REPLACE FUNCTION public.update_parcelle_status_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.parcelles
  SET status = 'vendu'::plot_status
  WHERE id = NEW.parcelle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_parcelle_on_sale
AFTER INSERT ON public.ventes_parcelles
FOR EACH ROW
EXECUTE FUNCTION public.update_parcelle_status_on_sale();
