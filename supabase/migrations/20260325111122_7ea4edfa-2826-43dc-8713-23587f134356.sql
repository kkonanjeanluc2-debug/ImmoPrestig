-- Allow team members to read their own beneficiaire records
CREATE POLICY "Members can view their own beneficiaire records"
ON public.beneficiaires_lots
FOR SELECT
USING (member_user_id = auth.uid());