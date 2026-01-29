-- Add commission percentage for real estate sales
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS sale_commission_percentage numeric DEFAULT 5;

-- Add comment for documentation
COMMENT ON COLUMN public.agencies.sale_commission_percentage IS 'Commission percentage for real estate sales (typically 3% to 5%)';