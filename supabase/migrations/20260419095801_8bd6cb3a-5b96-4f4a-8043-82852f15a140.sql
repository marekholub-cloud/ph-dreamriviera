-- Create rental-media bucket (public for viewing listings)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rental-media', 'rental-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Rental media publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'rental-media');

-- Authenticated users can upload to their own folder (folder name = user_id)
CREATE POLICY "Users can upload rental media to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rental-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update own rental media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rental-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own rental media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rental-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all rental media
CREATE POLICY "Admins manage all rental media"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'rental-media'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
