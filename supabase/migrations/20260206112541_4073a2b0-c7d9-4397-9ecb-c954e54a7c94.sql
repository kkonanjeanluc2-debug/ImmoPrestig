-- Remove the overly permissive public SELECT policy that exposes all active signature records
-- This policy allows anyone to query ALL active signatures, not just their own specific token
DROP POLICY IF EXISTS "Public can view signatures with valid token" ON public.contract_signatures;

-- Also drop the public UPDATE policy for the same reason - it's too permissive
DROP POLICY IF EXISTS "Can update signature with valid token" ON public.contract_signatures;