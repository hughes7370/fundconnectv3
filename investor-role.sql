-- SQL script to assign investor role to a user
-- Run this in the Supabase SQL Editor

-- Check if the user already exists in the investors table
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if the user already exists
  SELECT EXISTS (
    SELECT 1 FROM investors WHERE user_id = '58f4abb0-f2df-4905-b99e-041fd0694895'
  ) INTO user_exists;
  
  -- If user doesn't exist, insert them
  IF NOT user_exists THEN
    -- Insert the user as an investor
    INSERT INTO investors (user_id, name, approved)
    VALUES ('58f4abb0-f2df-4905-b99e-041fd0694895', 'New Investor', true);
    
    RAISE NOTICE 'Investor role assigned successfully';
  ELSE
    RAISE NOTICE 'User already has investor role';
  END IF;
END $$; 