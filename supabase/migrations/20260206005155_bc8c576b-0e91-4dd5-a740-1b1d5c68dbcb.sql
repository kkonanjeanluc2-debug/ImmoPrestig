-- Drop the old constraint
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_mobile_money_provider_check;

-- Add new constraint with all KKiaPay supported operators
ALTER TABLE public.agencies ADD CONSTRAINT agencies_mobile_money_provider_check 
CHECK (mobile_money_provider = ANY (ARRAY[
  'wave'::text, 
  'orange_money'::text, 
  'mtn_money'::text, 
  'moov'::text,
  'card'::text
]));