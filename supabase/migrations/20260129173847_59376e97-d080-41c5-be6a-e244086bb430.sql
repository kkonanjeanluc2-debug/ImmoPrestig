-- Create table for biens_vente images
CREATE TABLE public.biens_vente_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bien_id UUID NOT NULL REFERENCES public.biens_vente(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.biens_vente_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bien images"
ON public.biens_vente_images
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bien images"
ON public.biens_vente_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bien images"
ON public.biens_vente_images
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bien images"
ON public.biens_vente_images
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_biens_vente_images_bien_id ON public.biens_vente_images(bien_id);

-- Add comment
COMMENT ON TABLE public.biens_vente_images IS 'Gallery images for real estate sale properties';