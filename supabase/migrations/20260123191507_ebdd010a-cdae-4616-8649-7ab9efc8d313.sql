-- Create automation execution logs table
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Task type: payment_reminder, late_payment, sms_reminder, monthly_receipt, expire_contracts, check_expiring_contracts
  task_type TEXT NOT NULL,
  
  -- Execution details
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status: running, success, partial, failed
  status TEXT NOT NULL DEFAULT 'running',
  
  -- Metrics
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_success INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  
  -- Error details if any
  error_message TEXT,
  
  -- Additional details as JSON
  details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own automation logs"
  ON public.automation_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation logs"
  ON public.automation_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_automation_logs_user_task ON public.automation_logs (user_id, task_type, started_at DESC);