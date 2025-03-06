-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  avatar_url TEXT,
  company TEXT,
  title TEXT,
  bio TEXT,
  years_experience INTEGER,
  certifications TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  email_notifications BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT TRUE,
  profile_visibility TEXT DEFAULT 'private',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Create a trigger to create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_photos', 'profile_photos', true);

-- Set up storage policies for profile photos
-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;

-- Create simpler, more permissive policies
CREATE POLICY "Anyone can upload profile photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile_photos');

CREATE POLICY "Anyone can update profile photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile_photos');

CREATE POLICY "Anyone can delete profile photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile_photos');

CREATE POLICY "Profile photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile_photos'); 