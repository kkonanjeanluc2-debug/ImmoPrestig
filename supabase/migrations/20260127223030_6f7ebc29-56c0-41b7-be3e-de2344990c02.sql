-- Add new columns to tenants table for additional information
ALTER TABLE public.tenants
ADD COLUMN birth_date date,
ADD COLUMN birth_place text,
ADD COLUMN profession text,
ADD COLUMN cni_number text,
ADD COLUMN emergency_contact_name text,
ADD COLUMN emergency_contact_phone text;