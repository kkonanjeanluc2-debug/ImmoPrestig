-- Add deleted_at column to properties for soft delete
ALTER TABLE public.properties 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_properties_deleted_at ON public.properties(deleted_at);

-- Add deleted_at column to owners for soft delete
ALTER TABLE public.owners 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_owners_deleted_at ON public.owners(deleted_at);