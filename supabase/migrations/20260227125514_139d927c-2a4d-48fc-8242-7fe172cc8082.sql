
-- Add vendor_token and vendor response fields to offres_achat
ALTER TABLE public.offres_achat 
  ADD COLUMN IF NOT EXISTS vendor_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS vendor_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vendor_response_notes TEXT,
  ADD COLUMN IF NOT EXISTS vendor_responded_at TIMESTAMPTZ;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_offres_achat_vendor_token ON public.offres_achat (vendor_token) WHERE vendor_token IS NOT NULL;

-- Allow public SELECT on offres_achat by token (for vendor page)
CREATE POLICY "Public can view offer by vendor_token"
  ON public.offres_achat
  FOR SELECT
  USING (vendor_token IS NOT NULL);

-- Allow public UPDATE on offres_achat by vendor_token (for vendor counter-offer)
CREATE POLICY "Vendor can respond to offer via token"
  ON public.offres_achat
  FOR UPDATE
  USING (vendor_token IS NOT NULL AND vendor_token_expires_at > now() AND status IN ('en_attente', 'contre_offre'))
  WITH CHECK (vendor_token IS NOT NULL);
