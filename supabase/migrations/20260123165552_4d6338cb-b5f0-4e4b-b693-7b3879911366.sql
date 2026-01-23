-- Create storage bucket for agency logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for agency logos bucket
CREATE POLICY "Anyone can view agency logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency-logos');

CREATE POLICY "Users can upload their own agency logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own agency logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agency-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own agency logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);