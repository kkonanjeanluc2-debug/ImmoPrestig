-- Add unique constraint on email for tenants (scoped to user_id)
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_user_email_unique UNIQUE (user_id, email);

-- Add unique constraint on email for owners (scoped to user_id)
ALTER TABLE public.owners 
ADD CONSTRAINT owners_user_email_unique UNIQUE (user_id, email);

-- Add unique index on phone for tenants (scoped to user_id, only if phone is not null/empty)
CREATE UNIQUE INDEX tenants_user_phone_unique 
ON public.tenants (user_id, phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Add unique index on phone for owners (scoped to user_id, only if phone is not null/empty)
CREATE UNIQUE INDEX owners_user_phone_unique 
ON public.owners (user_id, phone) 
WHERE phone IS NOT NULL AND phone != '';