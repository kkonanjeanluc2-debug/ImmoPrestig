-- Add reservation deposit percentage column to agencies table
ALTER TABLE public.agencies 
ADD COLUMN reservation_deposit_percentage numeric NOT NULL DEFAULT 30;

-- Add comment explaining the column
COMMENT ON COLUMN public.agencies.reservation_deposit_percentage IS 'Percentage of the parcel price required as deposit for reservations (default 30%)';