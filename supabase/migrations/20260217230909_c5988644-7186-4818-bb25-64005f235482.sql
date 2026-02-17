-- Add GeniusPay configuration columns to agencies table
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS geniuspay_public_key TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS geniuspay_sandbox BOOLEAN DEFAULT true;