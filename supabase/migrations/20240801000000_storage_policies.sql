-- Create storage bucket for profile photos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'profile_photos'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profile_photos', 'profile_photos', true);
    END IF;
END $$;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete profile photos" ON storage.objects;

-- Create permissive policies for the profile_photos bucket
CREATE POLICY "Anyone can upload profile photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile_photos');

CREATE POLICY "Anyone can update profile photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile_photos');

CREATE POLICY "Anyone can delete profile photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile_photos');

CREATE POLICY "Profile photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile_photos');

-- Ensure the public folder exists in the bucket
-- Note: We're not setting path_tokens as it's a generated column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'profile_photos' AND name = 'public/'
    ) THEN
        INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata)
        VALUES (
            gen_random_uuid(), 
            'profile_photos', 
            'public/', 
            auth.uid(), 
            now(), 
            now(), 
            now(), 
            '{}'::jsonb
        );
    END IF;
END $$; 