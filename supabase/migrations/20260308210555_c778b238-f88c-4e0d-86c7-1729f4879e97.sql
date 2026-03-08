
-- Table for storing vente document signatures
CREATE TABLE public.vente_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES public.ventes_immobilieres(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contrat_vente', 'promesse_vente')),
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

-- Index for token-based lookups
CREATE INDEX idx_vente_signatures_token ON public.vente_signatures(signature_token) WHERE signature_token IS NOT NULL;
CREATE INDEX idx_vente_signatures_vente_id ON public.vente_signatures(vente_id);

-- Enable RLS
ALTER TABLE public.vente_signatures ENABLE ROW LEVEL SECURITY;

-- Policy: users can read signatures for their own ventes
CREATE POLICY "Users can read own vente signatures"
  ON public.vente_signatures
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ventes_immobilieres v 
      WHERE v.id = vente_id AND v.user_id = auth.uid()
    )
  );

-- Policy: users can insert signatures for their own ventes
CREATE POLICY "Users can insert vente signatures"
  ON public.vente_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add signature_status to ventes_immobilieres
ALTER TABLE public.ventes_immobilieres 
  ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending';
