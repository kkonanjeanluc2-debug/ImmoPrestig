-- Add deleted_at column to parcelles table for soft-delete
ALTER TABLE public.parcelles 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_parcelles_deleted_at ON public.parcelles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add deleted_at column to ilots table for soft-delete
ALTER TABLE public.ilots 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_ilots_deleted_at ON public.ilots(deleted_at) WHERE deleted_at IS NOT NULL;