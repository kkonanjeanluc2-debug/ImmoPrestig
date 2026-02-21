
-- Enum for unpaid case status (5 stages)
CREATE TYPE public.unpaid_case_status AS ENUM (
  'detected',
  'reminded',
  'formal_notice',
  'legal_proceedings',
  'awaiting_judgment',
  'eviction_validated',
  'eviction_executed',
  'eviction_cancelled',
  'resolved'
);

-- Enum for action types
CREATE TYPE public.unpaid_action_type AS ENUM (
  'detection',
  'email_reminder',
  'whatsapp_reminder',
  'sms_reminder',
  'formal_notice',
  'legal_transmission',
  'status_update',
  'note'
);

-- Main table for unpaid cases
CREATE TABLE public.unpaid_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  status unpaid_case_status NOT NULL DEFAULT 'detected',
  amount_due NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  days_late INTEGER NOT NULL DEFAULT 0,
  formal_notice_date DATE,
  legal_transmission_date DATE,
  lawyer_name TEXT,
  lawyer_email TEXT,
  lawyer_phone TEXT,
  court_reference TEXT,
  judgment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action history table
CREATE TABLE public.unpaid_case_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.unpaid_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type unpaid_action_type NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unpaid_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unpaid_case_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for unpaid_cases
CREATE POLICY "Users can view own unpaid cases"
ON public.unpaid_cases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own unpaid cases"
ON public.unpaid_cases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unpaid cases"
ON public.unpaid_cases FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own unpaid cases"
ON public.unpaid_cases FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for unpaid_case_actions
CREATE POLICY "Users can view own case actions"
ON public.unpaid_case_actions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own case actions"
ON public.unpaid_case_actions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_unpaid_cases_user_id ON public.unpaid_cases(user_id);
CREATE INDEX idx_unpaid_cases_tenant_id ON public.unpaid_cases(tenant_id);
CREATE INDEX idx_unpaid_cases_status ON public.unpaid_cases(status);
CREATE INDEX idx_unpaid_case_actions_case_id ON public.unpaid_case_actions(case_id);

-- Trigger for updated_at
CREATE TRIGGER update_unpaid_cases_updated_at
BEFORE UPDATE ON public.unpaid_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
