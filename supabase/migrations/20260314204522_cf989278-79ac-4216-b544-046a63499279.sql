
-- Add FK from expenses.user_id to profiles.user_id so PostgREST join works
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
