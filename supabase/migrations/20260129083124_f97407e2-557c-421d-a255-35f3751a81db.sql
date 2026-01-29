-- Add deleted_at column to parcelle_prospects table
ALTER TABLE public.parcelle_prospects ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for performance on deleted items queries
CREATE INDEX idx_parcelle_prospects_deleted_at ON public.parcelle_prospects(deleted_at) WHERE deleted_at IS NOT NULL;