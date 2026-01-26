-- Add deleted_at column for soft delete functionality
ALTER TABLE public.tenants 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance on soft delete filtering
CREATE INDEX idx_tenants_deleted_at ON public.tenants(deleted_at);

-- Update RLS policy to allow viewing deleted tenants for restore functionality
-- The existing policies already allow full access based on user_id/assigned_to