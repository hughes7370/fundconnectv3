import { useEffect, useState } from 'react';
import { supabase, isUserAuthenticated, getCurrentUser, getUserRole } from '../../utils/supabaseClient';
import Link from 'next/link';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Use the improved authentication check
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          console.log("No active session - user not logged in");
          setIsLoading(false);
          return;
        }
        
        // Now that we're authenticated, fetch conversations
        console.log("Fetching user conversations");
        // First check if the get_conversations_for_user RPC function exists
        // If not, we'll fall back to a manual query
        
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_conversations_for_user');
        
        if (!rpcError) {
          console.log("Retrieved conversations using RPC function:", rpcData?.length || 0);
          setConversations(rpcData || []);
        } else {
          console.log("RPC function not found, using manual query", rpcError);
          
          // Get current user
          const user = await getCurrentUser();
          
          if (!user) {
            throw new Error("You must be logged in to view messages");
          }
          
          // Check user role
          const roleInfo = await getUserRole(user.id);
          if (!roleInfo) {
            throw new Error("Your account is not set up as an investor or agent");
          }
          
          const isInvestor = roleInfo.role === 'investor';
          
          // Get conversations
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .select(`
              id,
              created_at,
              investor_id,
              agent_id,
              investors:investor_id(name),
              agents:agent_id(name)
            `)
            .or(
              isInvestor 
                ? `investor_id.eq.${user.id}`
                : `agent_id.eq.${user.id}`
            )
            .order('created_at', { ascending: false });
            
          if (convError) {
            throw new Error("Error fetching conversations: " + convError.message);
          }
          
          // Get last message for each conversation
          const conversationsWithMessages = await Promise.all(
            convData.map(async (conv) => {
              const { data: messages } = await supabase
                .from('messages')
                .select('content, timestamp, sender_id')
                .eq('conversation_id', conv.id)
                .order('timestamp', { ascending: false })
                .limit(1);
                
              return {
                id: conv.id,
                other_participant_name: isInvestor ? conv.agents?.name : conv.investors?.name,
                last_message: messages?.[0]?.content || null,
                last_message_timestamp: messages?.[0]?.timestamp || null,
                unread_count: 0 // Would need more complex logic to calculate this
              };
            })
          );
          
          setConversations(conversationsWithMessages);
        }
      } catch (err) {
        console.error("Error loading conversations:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, []);

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        
        {isLoading && (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading your conversations...</p>
          </div>
        )}
        
        {!isAuthenticated && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="mb-4">You need to log in to view and send messages.</p>
            <Link 
              href="/auth/login" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
            >
              Log In
            </Link>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p><strong>Error:</strong> {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {!isLoading && !error && conversations.length === 0 && (
          <div className="text-center py-10 border rounded-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium mb-2">No conversations yet</h2>
            <p className="text-gray-600">
              When you message an agent or investor, your conversations will appear here.
            </p>
          </div>
        )}
        
        {!isLoading && !error && conversations.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <Link 
                    href={`/messages/${conv.id}`}
                    className="block hover:bg-gray-50 transition-colors p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {conv.other_participant_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {conv.last_message_timestamp && (
                        <div className="text-xs text-gray-500">
                          {formatLastActivity(conv.last_message_timestamp)}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 