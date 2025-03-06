-- Function to check if a user is an agent
CREATE OR REPLACE FUNCTION is_agent(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  agent_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM agents WHERE user_id = user_id_param) INTO agent_exists;
  RETURN agent_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is an investor
CREATE OR REPLACE FUNCTION is_investor(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  investor_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM investors WHERE user_id = user_id_param) INTO investor_exists;
  RETURN investor_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all agents
CREATE OR REPLACE FUNCTION get_all_agents()
RETURNS SETOF agents AS $$
BEGIN
  RETURN QUERY SELECT * FROM agents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all investors
CREATE OR REPLACE FUNCTION get_all_investors()
RETURNS SETOF investors AS $$
BEGIN
  RETURN QUERY SELECT * FROM investors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  agent_record agents%ROWTYPE;
  investor_record investors%ROWTYPE;
BEGIN
  -- Check if user is an agent
  SELECT * FROM agents WHERE user_id = user_id_param INTO agent_record;
  
  -- Check if user is an investor
  SELECT * FROM investors WHERE user_id = user_id_param INTO investor_record;
  
  -- Build result JSON
  result = jsonb_build_object(
    'isAgent', agent_record IS NOT NULL,
    'isInvestor', investor_record IS NOT NULL
  );
  
  -- Add agent data if exists
  IF agent_record IS NOT NULL THEN
    result = result || jsonb_build_object('agentData', to_jsonb(agent_record));
  END IF;
  
  -- Add investor data if exists
  IF investor_record IS NOT NULL THEN
    result = result || jsonb_build_object('investorData', to_jsonb(investor_record));
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 