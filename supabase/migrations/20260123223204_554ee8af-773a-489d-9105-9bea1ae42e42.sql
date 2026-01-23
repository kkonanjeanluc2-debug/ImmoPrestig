-- Create super admin audit logs table
CREATE TABLE public.super_admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_agency_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.super_admin_audit_logs
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Only super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
ON public.super_admin_audit_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Add index for faster queries
CREATE INDEX idx_super_admin_audit_logs_created_at ON public.super_admin_audit_logs(created_at DESC);
CREATE INDEX idx_super_admin_audit_logs_action_type ON public.super_admin_audit_logs(action_type);