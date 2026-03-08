ALTER TABLE public.automation_schedules 
ADD COLUMN IF NOT EXISTS commission_report_day integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS commission_report_time text NOT NULL DEFAULT '09:00:00';