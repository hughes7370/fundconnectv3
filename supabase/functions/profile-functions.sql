-- Function to get a profile by ID, bypassing RLS policies
CREATE OR REPLACE FUNCTION get_profile_by_id(profile_id UUID)
RETURNS JSONB
SECURITY DEFINER -- This makes it run with the privileges of the creator
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', id,
      'name', name,
      'avatar_url', avatar_url,
      'bio', bio,
      'title', title,
      'years_experience', years_experience,
      'certifications', certifications,
      'linkedin_url', linkedin_url,
      'website_url', website_url,
      'company', company
    )
  INTO profile_data
  FROM profiles
  WHERE id = profile_id;
  
  RETURN profile_data;
END;
$$ LANGUAGE plpgsql;

-- Public function to get profile information that doesn't require auth
CREATE OR REPLACE FUNCTION get_public_profile(user_id UUID)
RETURNS JSONB
SECURITY INVOKER -- Runs with the privileges of the caller
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', id,
      'name', name,
      'avatar_url', avatar_url,
      'bio', bio,
      'title', title,
      'years_experience', years_experience,
      'certifications', certifications,
      'linkedin_url', linkedin_url,
      'website_url', website_url,
      'company', company
    )
  INTO profile_data
  FROM profiles
  WHERE id = user_id;
  
  RETURN profile_data;
END;
$$ LANGUAGE plpgsql;

-- Create a policy to allow public access to profiles for display purposes
DROP POLICY IF EXISTS "Profiles are viewable by anyone" ON profiles;
CREATE POLICY "Profiles are viewable by anyone" ON profiles
  FOR SELECT USING (true); 