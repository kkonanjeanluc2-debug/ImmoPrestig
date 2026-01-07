-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Allow anyone to view property images
CREATE POLICY "Property images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-images');

-- Allow authenticated users to upload property images
CREATE POLICY "Users can upload property images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'property-images');

-- Allow users to update their uploaded images
CREATE POLICY "Users can update property images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'property-images');

-- Allow users to delete property images
CREATE POLICY "Users can delete property images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'property-images');