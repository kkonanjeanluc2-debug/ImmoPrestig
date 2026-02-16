
-- Add KKiaPay configuration columns to agencies table
ALTER TABLE public.agencies
ADD COLUMN kkiapay_public_key TEXT DEFAULT NULL,
ADD COLUMN kkiapay_private_key TEXT DEFAULT NULL,
ADD COLUMN kkiapay_secret TEXT DEFAULT NULL,
ADD COLUMN kkiapay_sandbox BOOLEAN DEFAULT FALSE;
