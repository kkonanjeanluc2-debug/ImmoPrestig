
-- Create expenses table for agency accounting
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'autre',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT NULL,
  receipt_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agencies a
      JOIN public.agency_members am ON am.agency_id = a.id
      WHERE a.user_id = expenses.user_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
