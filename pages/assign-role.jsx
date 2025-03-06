import { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../utils/supabaseClient';

export default function AssignRole() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userRoles, setUserRoles] = useState({
    isInvestor: false,
    isAgent: false
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          setError("Could not get user information. Please make sure you're logged in.");
          setLoading(false);
          return;
        }
        
        setCurrentUser(user);
        
        // Check if user is already an investor
        const { data: investor } = await supabase
          .from('investors')
          .select('*')
          .eq('user_id', user.id);
          
        // Check if user is already an agent
        const { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id);
          
        setUserRoles({
          isInvestor: investor && investor.length > 0,
          isAgent: agent && agent.length > 0
        });
        
      } catch (err) {
        console.error("Error checking user:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);
  
  const assignRole = async (role) => {
    try {
      setAssigning(true);
      setError(null);
      setSuccess(null);
      
      if (!currentUser) {
        throw new Error("No user found");
      }
      
      if (role === 'investor') {
        // Create investor record with required fields based on your schema
        console.log("Creating investor record for user:", currentUser.id);
        const { data, error } = await supabase
          .from('investors')
          .insert({
            user_id: currentUser.id,
            name: currentUser.user_metadata?.name || 'New Investor',
            introducing_agent_id: null, // Optional field
            approved: true // Set to true so the investor can use the system immediately
          })
          .select();
          
        if (error) {
          console.error("Investor creation error:", error);
          throw error;
        }
        
        console.log("Investor created successfully:", data);
        setSuccess("You are now registered as an investor!");
        setUserRoles(prev => ({ ...prev, isInvestor: true }));
      } else if (role === 'agent') {
        // Create agent record
        console.log("Creating agent record for user:", currentUser.id);
        const { data, error } = await supabase
          .from('agents')
          .insert({
            user_id: currentUser.id,
            name: currentUser.user_metadata?.name || 'New Agent',
            firm: 'Your Company',
            broker_dealer_verified: false // Optional field
          })
          .select();
          
        if (error) {
          console.error("Agent creation error:", error);
          throw error;
        }
        
        console.log("Agent created successfully:", data);
        setSuccess("You are now registered as an agent!");
        setUserRoles(prev => ({ ...prev, isAgent: true }));
      }
    } catch (err) {
      console.error("Error assigning role:", err);
      // Show more detailed error message
      setError(`Failed to assign role: ${err.message}${err.details ? ` (${err.details})` : ''}`);
    } finally {
      setAssigning(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Assign User Role</h1>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading user information...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded mb-4">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-2 text-sm text-red-600">
            <p>If you're seeing a database error, it might be because:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>The required fields for the table don't match what we're trying to insert</li>
              <li>There might be a unique constraint violation</li>
              <li>You might not have permission to insert into this table</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Current User</h2>
            <p><strong>ID:</strong> {currentUser?.id}</p>
            <p><strong>Email:</strong> {currentUser?.email || 'No email available'}</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-4">Current Roles</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className={`inline-block w-4 h-4 rounded-full mr-2 ${userRoles.isInvestor ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>Investor: {userRoles.isInvestor ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center">
                <span className={`inline-block w-4 h-4 rounded-full mr-2 ${userRoles.isAgent ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>Agent: {userRoles.isAgent ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          
          {success && (
            <div className="bg-green-100 p-4 rounded">
              <p className="text-green-700">{success}</p>
            </div>
          )}
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Assign Role</h2>
            <p className="mb-4">
              To use the messaging system, you need to be registered as either an investor or an agent.
              Choose one of the options below:
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => assignRole('investor')}
                disabled={assigning || userRoles.isInvestor}
                className={`px-4 py-2 rounded-md ${
                  userRoles.isInvestor 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {userRoles.isInvestor ? 'Already an Investor' : assigning ? 'Registering...' : 'Register as Investor'}
              </button>
              
              <button
                onClick={() => assignRole('agent')}
                disabled={assigning || userRoles.isAgent}
                className={`px-4 py-2 rounded-md ${
                  userRoles.isAgent 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {userRoles.isAgent ? 'Already an Agent' : assigning ? 'Registering...' : 'Register as Agent'}
              </button>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <a 
              href="/test-messaging" 
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-block"
            >
              Test Messaging
            </a>
            
            <a 
              href="/auth-debug" 
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 inline-block"
            >
              Debug Authentication
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 