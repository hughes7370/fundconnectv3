
#!/bin/bash
curl -X POST 'https://iqejajqqjdccgedsnjgn.supabase.co/rest/v1/rpc/exec_sql' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWphanFxamRjY2dlZHNuamduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExOTc1NjUsImV4cCI6MjA1Njc3MzU2NX0.tbIPq5HmjUfITSuqGlqYtYPXYY6mtO6QWQAiGo04tdk' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWphanFxamRjY2dlZHNuamduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExOTc1NjUsImV4cCI6MjA1Njc3MzU2NX0.tbIPq5HmjUfITSuqGlqYtYPXYY6mtO6QWQAiGo04tdk' \
  -H 'Content-Type: application/json' \
  -d '{"query": "-- Create storage bucket for profile photos if it doesn't exist\nDO $$\nBEGIN\n    IF NOT EXISTS (\n        SELECT 1 FROM storage.buckets WHERE id = 'profile_photos'\n    ) THEN\n        INSERT INTO storage.buckets (id, name, public)\n        VALUES ('profile_photos', 'profile_photos', true);\n    END IF;\nEND $$;\n\n-- Drop any existing policies to avoid conflicts\nDROP POLICY IF EXISTS \"Users can upload their own profile photos\" ON storage.objects;\nDROP POLICY IF EXISTS \"Users can update their own profile photos\" ON storage.objects;\nDROP POLICY IF EXISTS \"Users can delete their own profile photos\" ON storage.objects;\nDROP POLICY IF EXISTS \"Profile photos are publicly accessible\" ON storage.objects;\nDROP POLICY IF EXISTS \"Anyone can upload profile photos\" ON storage.objects;\nDROP POLICY IF EXISTS \"Anyone can update profile photos\" ON storage.objects;\nDROP POLICY IF EXISTS \"Anyone can delete profile photos\" ON storage.objects;\n\n-- Create permissive policies for the profile_photos bucket\nCREATE POLICY \"Anyone can upload profile photos\" ON storage.objects\n  FOR INSERT WITH CHECK (bucket_id = 'profile_photos');\n\nCREATE POLICY \"Anyone can update profile photos\" ON storage.objects\n  FOR UPDATE USING (bucket_id = 'profile_photos');\n\nCREATE POLICY \"Anyone can delete profile photos\" ON storage.objects\n  FOR DELETE USING (bucket_id = 'profile_photos');\n\nCREATE POLICY \"Profile photos are publicly accessible\" ON storage.objects\n  FOR SELECT USING (bucket_id = 'profile_photos');\n\n-- Ensure the public folder exists in the bucket\n-- Note: We're not setting path_tokens as it's a generated column\nDO $$\nBEGIN\n    IF NOT EXISTS (\n        SELECT 1 FROM storage.objects \n        WHERE bucket_id = 'profile_photos' AND name = 'public/'\n    ) THEN\n        INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata)\n        VALUES (\n            gen_random_uuid(), \n            'profile_photos', \n            'public/', \n            auth.uid(), \n            now(), \n            now(), \n            now(), \n            '{}'::jsonb\n        );\n    END IF;\nEND $$; "}'
