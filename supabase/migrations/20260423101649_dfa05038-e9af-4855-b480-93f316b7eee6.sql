CREATE TABLE public.guided_tour_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tour_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped', 'postponed')),
  postponed_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tour_key)
);

CREATE INDEX idx_guided_tour_states_user_id ON public.guided_tour_states(user_id);
CREATE INDEX idx_guided_tour_states_tour_key ON public.guided_tour_states(tour_key);

ALTER TABLE public.guided_tour_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own guided tour states"
ON public.guided_tour_states
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guided tour states"
ON public.guided_tour_states
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guided tour states"
ON public.guided_tour_states
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guided tour states"
ON public.guided_tour_states
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_guided_tour_states_updated_at
BEFORE UPDATE ON public.guided_tour_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();