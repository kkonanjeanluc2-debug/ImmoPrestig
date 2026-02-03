-- Add mobile money fields to agencies table for receiving rent payments
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS mobile_money_number text,
ADD COLUMN IF NOT EXISTS mobile_money_provider text CHECK (mobile_money_provider IN ('orange_money', 'mtn_money', 'wave', 'moov'));