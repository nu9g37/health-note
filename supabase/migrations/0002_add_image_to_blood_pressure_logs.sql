ALTER TABLE public.blood_pressure_logs
ADD COLUMN image TEXT CHECK (image IS NULL OR char_length(trim(image)) > 0);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bp-images',
  'bp-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can view their own BP images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bp-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can upload their own BP images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bp-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their own BP images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bp-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'bp-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their own BP images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bp-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
