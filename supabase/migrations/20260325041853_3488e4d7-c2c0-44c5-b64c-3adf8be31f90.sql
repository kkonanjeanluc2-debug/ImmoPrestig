
-- Fix existing beneficiaire: link Kouassi to their team member account
UPDATE public.beneficiaires_lots 
SET member_user_id = 'f36ec8b3-b35f-46e0-975c-aa0072d70516'
WHERE id = '7aa6688b-db01-46c8-b0e5-d6df2608418e' 
AND nom = 'Kouassi' 
AND member_user_id IS NULL;
