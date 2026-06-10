CREATE TABLE IF NOT EXISTS public.biens_vente_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bien_id uuid NOT NULL REFERENCES public.biens_vente(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT biens_vente_images_pkey PRIMARY KEY (id)
);

ALTER TABLE public.biens_vente_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bien images"
ON public.biens_vente_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bien images"
ON public.biens_vente_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bien images"
ON public.biens_vente_images FOR DELETE
USING (auth.uid() = user_id);
