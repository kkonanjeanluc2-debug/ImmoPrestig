-- Add latitude and longitude columns to properties table
ALTER TABLE public.properties
ADD COLUMN latitude NUMERIC(10, 7),
ADD COLUMN longitude NUMERIC(10, 7);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.latitude IS 'Latitude GPS de la propriété';
COMMENT ON COLUMN public.properties.longitude IS 'Longitude GPS de la propriété';