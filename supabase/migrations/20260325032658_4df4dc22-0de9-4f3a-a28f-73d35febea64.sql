
-- Guide templates table
CREATE TABLE public.guide_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  district TEXT DEFAULT '',
  commune TEXT DEFAULT '',
  title_color TEXT DEFAULT '#CC0000',
  subtitle_color TEXT DEFAULT '#003399',
  border_color TEXT DEFAULT '#228B22',
  bg_color TEXT DEFAULT '#FFFFFF',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own guide templates"
  ON public.guide_templates FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add guide_template_id to lotissements
ALTER TABLE public.lotissements ADD COLUMN guide_template_id UUID REFERENCES public.guide_templates(id) ON DELETE SET NULL;
