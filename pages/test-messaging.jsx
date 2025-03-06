import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getCurrentUser } from '../utils/supabaseClient';
import Link from 'next/link';

export default function TestMessaging() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [forcedUserId, setForcedUserId] = useState(null);

  useEffect(() => {
    // Check if there's a forced user ID in localStorage
    try {
      const authToken = localStorage.getItem('supabase.auth.token');
      if (authToken) {
        const parsedToken = JSON.parse(authToken);
        if (parsedToken?.currentSession?.user?.id) {
          setForcedUserId(parsedToken.currentSession.user.id);
          console.log("Found forced user ID:", parsedToken.currentSession.user.id);
        }
      }
    } catch (e) {
      console.error("Error checking for forced user ID:", e);
    }

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching user data...");
      
      // Check for forced user ID in localStorage
      let userId = null;
      try {
        const authToken = localStorage.getItem('supabase.auth.token');
        if (authToken) {
          const parsedToken = JSON.parse(authToken);
          if (parsedToken?.currentSession?.user?.id) {
            userId = parsedToken.currentSession.user.id;
            setForcedUserId(userId);
            console.log("Found forced user ID:", userId);
          }
        }
      } catch (e) {
        console.error("Error checking for forced user ID:", e);
      }
      
      // If we don't have a forced ID, try to get the current user
      if (!userId) {
        // Get current user
        const user = await getCurrentUser();
        
        if (!user) {
          setError("No authenticated user found. Please log in.");
          setLoading(false);
          return;
        }
        
        userId = user.id;
        setCurrentUser(user);
      } else {
        // Create a minimal user object with the forced ID
        setCurrentUser({
          id: userId,
          email: 'forced@example.com',
          user_metadata: { name: 'Forced User' }
        });
      }
      
      console.log("Using user ID:", userId);
      
      // Use the API endpoints to check roles
      console.log("Checking roles via API endpoints...");
      
      // Fetch all agents from API
      try {
        const agentsResponse = await fetch('/api/get-all-agents');
        if (!agentsResponse.ok) {
          console.error("Error fetching agents from API:", await agentsResponse.text());
        } else {
          const allAgents = await agentsResponse.json();
          console.log("All agents from API:", allAgents);
          
          // Find if our user ID is in the agents list
          const agentRecord = allAgents?.find(agent => agent.user_id === userId);
          if (agentRecord) {
            console.log("Found user in agents table:", agentRecord);
            setUserRole('agent');
            
            // Fetch all investors for agents to message
            const investorsResponse = await fetch('/api/get-all-investors');
            if (investorsResponse.ok) {
              const allInvestors = await investorsResponse.json();
              setInvestors(allInvestors || []);
            }
          } else {
            // If not an agent, check if user is an investor
            const investorsResponse = await fetch('/api/get-all-investors');
            if (!investorsResponse.ok) {
              console.error("Error fetching investors from API:", await investorsResponse.text());
            } else {
              const allInvestors = await investorsResponse.json();
              console.log("All investors from API:", allInvestors);
              
              // Find if our user ID is in the investors list
              const investorRecord = allInvestors?.find(investor => investor.user_id === userId);
              if (investorRecord) {
                console.log("Found user in investors table:", investorRecord);
                setUserRole('investor');
                
                // Set agents for investors to message
                setAgents(allAgents || []);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching roles from API:", error);
        
        // Fallback to the check-role API
        console.log("Falling back to check-role API...");
        try {
          const response = await fetch(`/api/check-role?userId=${userId}`);
          const roleData = await response.json();
          
          console.log("Role data from API:", roleData);
          
          if (roleData.isAgent) {
            console.log("API confirms user is an agent");
            setUserRole('agent');
            
            // Fetch all investors for agents to message
            const investorsResponse = await fetch('/api/get-all-investors');
            if (investorsResponse.ok) {
              const allInvestors = await investorsResponse.json();
              setInvestors(allInvestors || []);
            }
          } else if (roleData.isInvestor) {
            console.log("API confirms user is an investor");
            setUserRole('investor');
            
            // Fetch all agents for investors to message
            const agentsResponse = await fetch('/api/get-all-agents');
            if (agentsResponse.ok) {
              const allAgents = await agentsResponse.json();
              setAgents(allAgents || []);
            }
          } else {
            console.log("User has no role assigned according to API");
            setUserRole(null);
          }
        } catch (apiError) {
          console.error("Error with check-role API:", apiError);
          setUserRole(null);
        }
      }
      
      // Fetch conversations for the user if role is detected
      if (userRole === 'investor') {
        console.log("Fetching conversations for investor...");
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            investor:investor_id(name),
            agent:agent_id(name)
          `)
          .eq('investor_id', userId);
        
        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError);
        } else {
          setConversations(conversationsData || []);
        }
      } else if (userRole === 'agent') {
        console.log("Fetching conversations for agent...");
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            investor:investor_id(name),
            agent:agent_id(name)
          `)
          .eq('agent_id', userId);
        
        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError);
        } else {
          setConversations(conversationsData || []);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      setError(`Error fetching user data: ${error.message}`);
      setLoading(false);
    }
  };

  const createTestConversation = async (partnerId, partnerType) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the user ID (either forced or from current user)
      let userId = forcedUserId;
      if (!userId && currentUser) {
        userId = currentUser.id;
      }
      
      if (!userId) {
        setError("No user ID found. Please log in or use the User Identity Check page.");
        setLoading(false);
        return;
      }
      
      if (!userRole) {
        setError("You must have a role assigned (investor or agent) to create conversations.");
        setLoading(false);
        return;
      }
      
      console.log(`Creating test conversation between ${userRole} and ${partnerType}...`);
      console.log(`Current user ID: ${userId}`);
      
      // Check if a conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .or(
          userRole === 'investor' 
            ? `and(investor_id.eq.${userId},agent_id.eq.${partnerId})` 
            : `and(investor_id.eq.${partnerId},agent_id.eq.${userId})`
        )
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing conversation:", checkError);
        setError(`Error checking existing conversation: ${checkError.message}`);
        setLoading(false);
        return;
      }
      
      if (existingConversation) {
        console.log("Conversation already exists:", existingConversation);
        setSuccessMessage(`Conversation already exists! Redirecting to conversation...`);
        
        // Redirect to the conversation
        setTimeout(() => {
          window.location.href = `/conversation/${existingConversation.id}`;
        }, 2000);
        
        setLoading(false);
        return;
      }
      
      // Create a new conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert([
          {
            investor_id: userRole === 'investor' ? userId : partnerId,
            agent_id: userRole === 'agent' ? userId : partnerId,
            last_message_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      
      if (conversationError) {
        console.error("Error creating conversation:", conversationError);
        setError(`Error creating conversation: ${conversationError.message}`);
        setLoading(false);
        return;
      }
      
      console.log("Created conversation:", conversation);
      
      // Create an initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: userId,
            sender_type: userRole,
            content: `Hello! This is a test message from ${userRole} ${currentUser?.user_metadata?.name || userId}.`,
            read: false
          }
        ]);
      
      if (messageError) {
        console.error("Error creating message:", messageError);
        setError(`Error creating message: ${messageError.message}`);
      } else {
        setSuccessMessage(`Conversation created successfully! Redirecting to conversation...`);
        
        // Redirect to the conversation
        setTimeout(() => {
          window.location.href = `/conversation/${conversation.id}`;
        }, 2000);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in createTestConversation:", error);
      setError(`Error creating test conversation: ${error.message}`);
      setLoading(false);
    }
  };

  const assignRole = async (role) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the user ID (either forced or from current user)
      let userId = forcedUserId;
      if (!userId && currentUser) {
        userId = currentUser.id;
      }
      
      if (!userId) {
        setError("No user ID found. Please log in or use the User Identity Check page.");
        setLoading(false);
        return;
      }
      
      console.log(`Assigning ${role} role to user ID: ${userId}`);
      
      // Log the request body for debugging
      const requestBody = {
        userId: userId,
        role: role
      };
      console.log("Request body:", JSON.stringify(requestBody));
      
      const response = await fetch('/api/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      // Parse the response if it's valid JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing response:", e);
        throw new Error(`Invalid response from server: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error("Error response:", data);
        
        // If there's a SQL command in the response, show it
        if (data.sqlCommand) {
          const errorMessage = `
            Error assigning ${role} role: ${data.details || data.error}
            
            You can run this SQL in the Supabase SQL Editor to bypass RLS:
            ${data.sqlCommand}
          `;
          throw new Error(errorMessage);
        } else {
          throw new Error(data.error || data.message || `Failed to assign ${role} role`);
        }
      }
      
      console.log(`Role assignment response:`, data);
      setSuccessMessage(`Successfully assigned ${role} role! Refreshing data...`);
      
      // Refresh user data
      setTimeout(() => {
        fetchUserData();
      }, 1000);
    } catch (error) {
      console.error(`Error assigning ${role} role:`, error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Helper function to handle agent data
  const handleAgentData = (data) => {
    console.log("All agents:", data);
    setSuccessMessage(`Found ${data.length} agents. Check console for details.`);
    
    // Display the agent details if available
    if (data && data.length > 0) {
      const agentDetails = data.map(agent => 
        `Agent: ${agent.name}, ID: ${agent.user_id}`
      ).join('\n');
      alert(`Agents in database:\n${agentDetails}`);
    } else {
      alert("No agents found in the database.");
    }
  };
  
  // Helper function to handle investor data
  const handleInvestorData = (data) => {
    console.log("All investors:", data);
    setSuccessMessage(`Found ${data.length} investors. Check console for details.`);
    
    // Display the investor details if available
    if (data && data.length > 0) {
      const investorDetails = data.map(investor => 
        `Investor: ${investor.name}, ID: ${investor.user_id}`
      ).join('\n');
      alert(`Investors in database:\n${investorDetails}`);
    } else {
      alert("No investors found in the database.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Messaging System</h1>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 p-4">
              <p className="text-green-700">{successMessage}</p>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">User Information</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {currentUser ? (
                <div className="space-y-2">
                  <p><strong>User ID:</strong> {currentUser.id}</p>
                  <p><strong>Email:</strong> {currentUser.email}</p>
                  {forcedUserId && (
                    <p className="text-purple-600 font-bold">Using forced user ID: {forcedUserId}</p>
                  )}
                  <p>
                    <strong>Role:</strong> 
                    {userRole ? (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        No Role Assigned
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p>No authenticated user found. Please log in.</p>
              )}
            </div>
          </div>
          
          {currentUser && !userRole && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700 mb-4">
                You need to assign yourself a role (investor or agent) before you can use the messaging system.
              </p>
              <div className="mb-4 flex space-x-4">
                <button
                  onClick={() => assignRole('investor')}
                  className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Assign Investor Role
                </button>
                <button
                  onClick={() => assignRole('agent')}
                  className="inline-block px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Assign Agent Role
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-700">
                <p className="font-semibold">If the buttons above don't work due to RLS policies, you can run this SQL in the Supabase SQL Editor:</p>
                <div className="mt-2 bg-gray-100 p-3 rounded overflow-auto">
                  <pre className="text-xs">
{`-- For Investor Role:
INSERT INTO investors (user_id, name, approved)
VALUES ('${forcedUserId || currentUser?.id}', 'New Investor', true);

-- For Agent Role:
INSERT INTO agents (user_id, name, firm)
VALUES ('${forcedUserId || currentUser?.id}', 'New Agent', 'Your Company');`}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Debug Authentication</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you're having issues with authentication or role detection, use these tools:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Link href="/user-check" legacyBehavior>
                <a className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  User Identity Check
                </a>
              </Link>
              <button
                onClick={fetchUserData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh User Data
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    console.log("Fetching all agents from API endpoint");
                    
                    // Use the API endpoint to get all agents
                    const response = await fetch('/api/get-all-agents');
                    if (!response.ok) {
                      throw new Error(`API error: ${response.status}`);
                    }
                    
                    const agents = await response.json();
                    handleAgentData(agents);
                  } catch (error) {
                    console.error("Error fetching agents:", error);
                    setError(`Failed to fetch agents: ${error.message}`);
                    
                    // Last resort - show SQL to run
                    alert(`Error fetching agents. Please run this SQL in Supabase SQL Editor:\n\nSELECT * FROM agents;`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Show All Agents
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    console.log("Fetching all investors from API endpoint");
                    
                    // Use the API endpoint to get all investors
                    const response = await fetch('/api/get-all-investors');
                    if (!response.ok) {
                      throw new Error(`API error: ${response.status}`);
                    }
                    
                    const investors = await response.json();
                    handleInvestorData(investors);
                  } catch (error) {
                    console.error("Error fetching investors:", error);
                    setError(`Failed to fetch investors: ${error.message}`);
                    
                    // Last resort - show SQL to run
                    alert(`Error fetching investors. Please run this SQL in Supabase SQL Editor:\n\nSELECT * FROM investors;`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Show All Investors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
