
-- Create achat_signatures table for digital signatures on purchase documents
CREATE TABLE public.achat_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  achat_id UUID NOT NULL REFERENCES public.achats_immobiliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('acte_achat', 'compromis_achat')),
  signer_type TEXT NOT NULL CHECK (signer_type IN ('vendor', 'buyer')),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT,
  signature_text TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  signature_token UUID,
  token_expires_at TIMESTAMPTZ,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achat_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own achat signatures"
ON public.achat_signatures FOR SELECT TO authenticated
USING (user_id = auth.uid() OR achat_id IN (
  SELECT id FROM public.achats_immobiliers WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert achat signatures"
ON public.achat_signatures FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update achat signatures"
ON public.achat_signatures FOR UPDATE TO authenticated
USING (user_id = auth.uid());
