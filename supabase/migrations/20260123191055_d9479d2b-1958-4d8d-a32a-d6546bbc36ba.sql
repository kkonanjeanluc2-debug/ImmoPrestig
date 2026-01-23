-- Create automation schedules table
CREATE TABLE public.automation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Rappels de paiement J-3
  payment_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_reminder_time TIME NOT NULL DEFAULT '08:00:00',
  payment_reminder_days_before INTEGER NOT NULL DEFAULT 3,
  
  -- Relances retards J+1
  late_payment_enabled BOOLEAN NOT NULL DEFAULT true,
  late_payment_time TIME NOT NULL DEFAULT '09:00:00',
  late_payment_days_after INTEGER NOT NULL DEFAULT 1,
  
  -- SMS automatiques
  sms_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_reminder_time TIME NOT NULL DEFAULT '09:00:00',
  sms_reminder_weekdays INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Sunday, 1=Monday, etc.
  
  -- Quittances mensuelles
  monthly_receipt_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_receipt_day INTEGER NOT NULL DEFAULT 2, -- Day of month (1-28)
  monthly_receipt_time TIME NOT NULL DEFAULT '08:00:00',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_schedule UNIQUE (user_id),
  CONSTRAINT valid_receipt_day CHECK (monthly_receipt_day >= 1 AND monthly_receipt_day <= 28),
  CONSTRAINT valid_reminder_days CHECK (payment_reminder_days_before >= 1 AND payment_reminder_days_before <= 14),
  CONSTRAINT valid_late_days CHECK (late_payment_days_after >= 1 AND late_payment_days_after <= 7)
);

-- Enable RLS
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own automation schedules"
  ON public.automation_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation schedules"
  ON public.automation_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation schedules"
  ON public.automation_schedules
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_automation_schedules_updated_at
  BEFORE UPDATE ON public.automation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();