ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS wave_api_key text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wave_sandbox boolean DEFAULT true;