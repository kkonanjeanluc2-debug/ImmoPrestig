-- Add deleted_at column to lotissements table for soft-delete
ALTER TABLE public.lotissements 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance on deleted_at
CREATE INDEX idx_lotissements_deleted_at ON public.lotissements(deleted_at) WHERE deleted_at IS NOT NULL;