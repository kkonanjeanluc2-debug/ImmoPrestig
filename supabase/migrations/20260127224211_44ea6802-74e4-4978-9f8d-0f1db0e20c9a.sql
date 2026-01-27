-- Add new columns to owners table for personal information
ALTER TABLE public.owners 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_place text,
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS cni_number text;