-- Add is_active column to agencies table for account activation/deactivation
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.agencies.is_active IS 'Indicates if the account is active. Super admins can toggle this.';