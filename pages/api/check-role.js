import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  console.log(`Checking role for user ID: ${userId}`);

  try {
    // Use the get_user_role function
    const { data, error } = await supabase.rpc('get_user_role', {
      user_id_param: userId
    });

    if (error) {
      console.error("Error calling get_user_role:", error);
      
      // Fallback to direct queries if the RPC fails
      try {
        // Check if user is an agent
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', userId);

        if (agentError) {
          console.error("Error checking agent role:", agentError);
        } else if (agentData && agentData.length > 0) {
          console.log("Found agent:", agentData);
          return res.status(200).json({ 
            isAgent: true, 
            isInvestor: false,
            agentData: agentData[0]
          });
        }

        // Check if user is an investor
        const { data: investorData, error: investorError } = await supabase
          .from('investors')
          .select('*')
          .eq('user_id', userId);

        if (investorError) {
          console.error("Error checking investor role:", investorError);
        } else if (investorData && investorData.length > 0) {
          console.log("Found investor:", investorData);
          return res.status(200).json({ 
            isAgent: false, 
            isInvestor: true,
            investorData: investorData[0]
          });
        }

        // If we get here, the user has no role
        console.log("No role found for user:", userId);
        return res.status(200).json({ 
          isAgent: false, 
          isInvestor: false,
          message: "User has no role assigned"
        });
      } catch (fallbackError) {
        console.error("Error in fallback queries:", fallbackError);
        return res.status(500).json({ 
          error: 'Error checking role', 
          details: fallbackError.message 
        });
      }
    }

    console.log("Role data from function:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ 
      error: 'Unexpected error checking role', 
      details: error.message 
    });
  }
} 