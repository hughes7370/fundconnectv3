-- Add additional fields to funds table for more detailed profiles
ALTER TABLE funds
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS investment_strategy TEXT,
ADD COLUMN IF NOT EXISTS target_return NUMERIC,
ADD COLUMN IF NOT EXISTS fund_manager TEXT,
ADD COLUMN IF NOT EXISTS fund_manager_bio TEXT,
ADD COLUMN IF NOT EXISTS fund_website TEXT,
ADD COLUMN IF NOT EXISTS fund_logo_url TEXT;

-- Add a policy to allow public access to fund logos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'fund_logos'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('fund_logos', 'fund_logos', true);
    END IF;
END $$;

-- Create policies for fund logos
DROP POLICY IF EXISTS "Anyone can upload fund logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update fund logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete fund logos" ON storage.objects;
DROP POLICY IF EXISTS "Fund logos are publicly accessible" ON storage.objects;

CREATE POLICY "Anyone can upload fund logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fund_logos');

CREATE POLICY "Anyone can update fund logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'fund_logos');

CREATE POLICY "Anyone can delete fund logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'fund_logos');

CREATE POLICY "Fund logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'fund_logos'); 