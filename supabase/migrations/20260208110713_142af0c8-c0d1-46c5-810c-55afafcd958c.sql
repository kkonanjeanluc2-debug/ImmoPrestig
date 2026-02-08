-- Allow agency members to view their agency's subscription
CREATE POLICY "Agency members can view their agency subscription"
ON public.agency_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.agency_members am
    WHERE am.agency_id = agency_subscriptions.agency_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);