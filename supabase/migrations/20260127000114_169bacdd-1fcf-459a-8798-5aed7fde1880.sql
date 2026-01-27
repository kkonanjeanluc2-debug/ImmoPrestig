-- Add UNIQUE constraint on user_id in user_roles table
-- This is required for the upsert operation in create-agency-member edge function
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);