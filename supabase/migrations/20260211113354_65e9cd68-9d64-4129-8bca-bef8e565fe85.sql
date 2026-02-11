
-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own contract signatures" ON public.contract_signatures;

-- Create a new policy that lets users see signatures for contracts they own
CREATE POLICY "Users can view signatures for their contracts"
ON public.contract_signatures
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_signatures.contract_id
    AND c.user_id = auth.uid()
  )
);
