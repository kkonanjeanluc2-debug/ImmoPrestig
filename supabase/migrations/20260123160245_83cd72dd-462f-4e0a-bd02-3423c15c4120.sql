-- Create WhatsApp logs table
CREATE TABLE public.whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  payment_id UUID,
  document_id UUID,
  message_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_preview TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own WhatsApp logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp logs"
  ON public.whatsapp_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp logs"
  ON public.whatsapp_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for common queries
CREATE INDEX idx_whatsapp_logs_tenant_id ON public.whatsapp_logs(tenant_id);
CREATE INDEX idx_whatsapp_logs_user_id ON public.whatsapp_logs(user_id);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);