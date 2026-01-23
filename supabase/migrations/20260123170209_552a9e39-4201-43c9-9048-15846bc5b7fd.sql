-- Add branding color columns to agencies table
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1e3a5f',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#2ecc71',
ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT '#1e3a5f';