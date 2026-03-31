
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload agency assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agency-assets');

CREATE POLICY "Users can view agency assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agency-assets');

CREATE POLICY "Users can delete agency assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agency-assets');
