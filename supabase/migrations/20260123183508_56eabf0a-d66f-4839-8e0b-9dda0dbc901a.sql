-- Create table for receipt templates
CREATE TABLE public.receipt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL DEFAULT 'QUITTANCE DE LOYER',
  declaration_text TEXT NOT NULL DEFAULT 'Je soussigné(e) {bailleur}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de {locataire} la somme de {montant} au titre du paiement du loyer et des charges pour la période du {periode}.',
  footer_text TEXT NOT NULL DEFAULT 'Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement partiel du loyer.',
  signature_text TEXT NOT NULL DEFAULT 'Fait pour valoir ce que de droit.',
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_contacts BOOLEAN NOT NULL DEFAULT true,
  show_amount_in_words BOOLEAN NOT NULL DEFAULT true,
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  currency_symbol TEXT NOT NULL DEFAULT 'FCFA',
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,
  watermark_type TEXT NOT NULL DEFAULT 'text',
  watermark_text TEXT DEFAULT 'QUITTANCE',
  watermark_image_url TEXT,
  watermark_opacity NUMERIC NOT NULL DEFAULT 15,
  watermark_angle NUMERIC NOT NULL DEFAULT -45,
  watermark_position TEXT NOT NULL DEFAULT 'center',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own receipt templates"
ON public.receipt_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipt templates"
ON public.receipt_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipt templates"
ON public.receipt_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipt templates"
ON public.receipt_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_receipt_templates_updated_at
BEFORE UPDATE ON public.receipt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();