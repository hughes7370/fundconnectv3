-- SQL script to assign agent role to a user
-- Run this in the Supabase SQL Editor

-- Check if the user already exists in the agents table
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if the user already exists
  SELECT EXISTS (
    SELECT 1 FROM agents WHERE user_id = '58f4abb0-f2df-4905-b99e-041fd0694895'
  ) INTO user_exists;
  
  -- If user doesn't exist, insert them
  IF NOT user_exists THEN
    -- Insert the user as an agent
    INSERT INTO agents (user_id, name, firm)
    VALUES ('58f4abb0-f2df-4905-b99e-041fd0694895', 'New Agent', 'Your Company');
    
    RAISE NOTICE 'Agent role assigned successfully';
  ELSE
    RAISE NOTICE 'User already has agent role';
  END IF;
END $$; 