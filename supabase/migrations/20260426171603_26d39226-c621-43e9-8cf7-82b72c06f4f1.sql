-- Allow tenants (portal users) to read receipt templates of their agency owner
CREATE POLICY "Tenants can view their agency receipt templates"
ON public.receipt_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.portal_user_id = auth.uid()
      AND t.user_id = receipt_templates.user_id
  )
);