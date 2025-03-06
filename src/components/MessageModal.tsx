import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

interface MessageModalProps {
  conversationId: string;
  onClose: () => void;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
}

interface User {
  name: string;
  user_id: string;
}

export default function MessageModal({ conversationId, onClose }: MessageModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'investor' | 'agent' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Check authentication and get user info
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication");
        setIsLoading(true);
        
        // Get user session
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        
        if (!session || !session.user) {
          console.log("No active session - user not logged in");
          setError("You need to be logged in to view this conversation");
          setIsLoading(false);
          return;
        }
        
        console.log("User authenticated:", session.user.id);
        setCurrentUserId(session.user.id);
        
        // Try using the check-role API endpoint first
        try {
          console.log("Checking role via API endpoint");
          const response = await fetch(`/api/check-role?userId=${session.user.id}`);
          if (response.ok) {
            const roleData = await response.json();
            console.log("Role data from API:", roleData);
            
            if (roleData.isAgent) {
              console.log("API confirms user is an agent");
              setUserRole('agent');
              setIsLoading(false);
              return;
            } else if (roleData.isInvestor) {
              console.log("API confirms user is an investor");
              setUserRole('investor');
              setIsLoading(false);
              return;
            }
          } else {
            console.log("API endpoint failed:", await response.text());
          }
        } catch (apiError) {
          console.error("Error using API endpoint:", apiError);
        }
        
        // Fallback to direct database queries
        console.log("Falling back to direct database queries");
        
        // Check if user is an investor
        const { data: investor } = await supabase
          .from('investors')
          .select('*')
          .eq('user_id', session.user.id);
          
        if (investor && investor.length > 0) {
          console.log("User is an investor:", investor[0]);
          setUserRole('investor');
        } else {
          // Check if user is an agent
          const { data: agent } = await supabase
            .from('agents')
            .select('*')
            .eq('user_id', session.user.id);
            
          if (agent && agent.length > 0) {
            console.log("User is an agent:", agent[0]);
            setUserRole('agent');
          } else {
            // Last resort - try fetching all agents and investors
            try {
              console.log("Trying to fetch all agents and investors");
              
              // Fetch all agents
              const agentsResponse = await fetch('/api/get-all-agents');
              if (agentsResponse.ok) {
                const allAgents = await agentsResponse.json();
                console.log("All agents from API:", allAgents?.length || 0);
                
                // Find if our user ID is in the agents list
                const agentRecord = allAgents?.find((agent: any) => agent.user_id === session.user.id);
                if (agentRecord) {
                  console.log("Found user in agents list:", agentRecord);
                  setUserRole('agent');
                  setIsLoading(false);
                  return;
                }
              }
              
              // Fetch all investors
              const investorsResponse = await fetch('/api/get-all-investors');
              if (investorsResponse.ok) {
                const allInvestors = await investorsResponse.json();
                console.log("All investors from API:", allInvestors?.length || 0);
                
                // Find if our user ID is in the investors list
                const investorRecord = allInvestors?.find((investor: any) => investor.user_id === session.user.id);
                if (investorRecord) {
                  console.log("Found user in investors list:", investorRecord);
                  setUserRole('investor');
                  setIsLoading(false);
                  return;
                }
              }
            } catch (fetchError) {
              console.error("Error fetching all agents/investors:", fetchError);
            }
            
            console.log("User is neither investor nor agent");
            setError("You don't have permission to view this conversation");
            setIsLoading(false);
            return;
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Load conversation data when authenticated and role is determined
  useEffect(() => {
    if (!conversationId || !currentUserId || !userRole) return;
    
    const fetchConversation = async () => {
      setIsLoading(true);
      setError(null);
      
      // Helper function to process conversation data
      const processConversation = async (conversation: any) => {
        console.log("Processing conversation:", conversation);
        console.log("Current user ID:", currentUserId);
        console.log("User role:", userRole);
        console.log("Investor ID in conversation:", conversation.investor_id);
        console.log("Agent ID in conversation:", conversation.agent_id);
        
        // Check if user is part of this conversation - with string comparison to handle UUID format issues
        if (userRole === 'investor' && String(conversation.investor_id) !== String(currentUserId)) {
          console.error("Permission denied: User is an investor but not the investor in this conversation");
          console.error(`Expected: ${conversation.investor_id}, Got: ${currentUserId}`);
          throw new Error("You don't have permission to view this conversation");
        } else if (userRole === 'agent' && String(conversation.agent_id) !== String(currentUserId)) {
          console.error("Permission denied: User is an agent but not the agent in this conversation");
          console.error(`Expected: ${conversation.agent_id}, Got: ${currentUserId}`);
          throw new Error("You don't have permission to view this conversation");
        }
        
        console.log("Permission check passed");
        
        // Get other participant details
        const otherUserId = userRole === 'investor' ? conversation.agent_id : conversation.investor_id;
        
        let otherParticipant;
        if (userRole === 'investor') {
          // Get agent details
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('name, user_id')
            .eq('user_id', otherUserId)
            .single();
            
          if (agentError) {
            console.error("Error fetching agent details:", agentError);
          } else {
            otherParticipant = agent;
          }
        } else {
          // Get investor details
          const { data: investor, error: investorError } = await supabase
            .from('investors')
            .select('name, user_id')
            .eq('user_id', otherUserId)
            .single();
            
          if (investorError) {
            console.error("Error fetching investor details:", investorError);
          } else {
            otherParticipant = investor;
          }
        }
        
        console.log("Other participant:", otherParticipant);
        setOtherUser(otherParticipant || { name: "User", user_id: otherUserId });
        
        // Fetch messages
        console.log("Fetching messages for conversation");
        const { data: messagesData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('timestamp', { ascending: true });
          
        if (msgError) {
          throw new Error(`Error loading messages: ${msgError.message}`);
        }
        
        console.log(`Loaded ${messagesData?.length || 0} messages`);
        setMessages(messagesData || []);
        
        // Mark conversation as read
        const lastReadField = userRole === 'investor' ? 'investor_last_read' : 'agent_last_read';
        await supabase
          .from('conversations')
          .update({ [lastReadField]: new Date().toISOString() })
          .eq('id', conversationId);
          
        console.log("Marked conversation as read");
      };
      
      try {
        console.log("Fetching conversation:", conversationId);
        
        // Try to get the conversation using the API first
        try {
          console.log("Trying to get conversation via API");
          const response = await fetch(`/api/get-conversation?id=${conversationId}`);
          if (response.ok) {
            const conversation = await response.json();
            console.log("Got conversation from API:", conversation);
            await processConversation(conversation);
            return; // Exit early if we successfully got the conversation via API
          } else {
            console.log("API endpoint failed:", await response.text());
          }
        } catch (apiError) {
          console.error("Error using API endpoint:", apiError);
        }
        
        // Fallback to direct database query
        console.log("Falling back to direct database query");
        
        // Fetch the conversation details
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select(`
            id,
            investor_id,
            agent_id,
            created_at
          `)
          .eq('id', conversationId)
          .single();
          
        if (convError) {
          throw new Error(`Error loading conversation: ${convError.message}`);
        }
        
        if (!conversation) {
          throw new Error("Conversation not found");
        }
        
        await processConversation(conversation);
      } catch (err) {
        console.error("Error in conversation detail:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversation();
  }, [conversationId, currentUserId, userRole]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up real-time subscription for new messages");
    
    // Create a more specific channel name to avoid conflicts
    const channelName = `conversation-messages-${conversationId}`;
    console.log(`Creating channel: ${channelName}`);
    
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        }, 
        (payload) => {
          console.log("New message received in real-time:", payload.new);
          
          // Add the new message to the state
          setMessages(prev => {
            // Check if the message is already in the array to avoid duplicates
            const messageExists = prev.some(msg => msg.id === payload.new.id);
            if (messageExists) {
              console.log("Message already exists in state, not adding again");
              return prev;
            }
            
            console.log("Adding new message to state");
            return [...prev, payload.new as Message];
          });
          
          // Mark as read if message is from other user
          if (payload.new.sender_id !== currentUserId && userRole) {
            const lastReadField = userRole === 'investor' ? 'investor_last_read' : 'agent_last_read';
            supabase
              .from('conversations')
              .update({ [lastReadField]: new Date().toISOString() })
              .eq('id', conversationId);
          }
          
          // Scroll to bottom to show new message
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });
      
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(subscription);
    };
  }, [conversationId, currentUserId, userRole]);

  // Send message function
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUserId || !conversationId) return;
    
    setIsSending(true);
    
    // Create a temporary message object for immediate display
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isTemp: true // Flag to identify temporary messages
    };
    
    // Add the temporary message to the UI immediately
    setMessages(prev => [...prev, tempMessage as any]);
    
    // Clear the input field immediately for better UX
    setNewMessage('');
    
    // Scroll to the new message
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    try {
      console.log("Sending new message");
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: tempMessage.content,
          timestamp: tempMessage.timestamp
        })
        .select();
        
      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
      
      console.log("Message sent successfully:", data);
      
      // Replace the temporary message with the real one if needed
      if (data && data.length > 0) {
        setMessages(prev => 
          prev.map(msg => 
            (msg as any).isTemp ? data[0] : msg
          )
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => (msg as any).id !== tempMessage.id));
      
      // Show error to user
      alert(`Error: ${err instanceof Error ? err.message : "An unknown error occurred"}`);
      
      // Put the message text back in the input field
      setNewMessage(tempMessage.content);
    } finally {
      setIsSending(false);
    }
  };

  // Format message timestamp
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: Record<string, Message[]> = {};
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateStr = date.toLocaleDateString();
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(msg);
    });
    
    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">Messages</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Loading conversation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <span className="text-2xl">!</span>
              </div>
              <h2 className="text-xl font-medium mb-2">Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={onClose}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main message view
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
              {otherUser?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-medium">{otherUser?.name || 'User'}</h3>
              <p className="text-sm text-gray-500">
                {userRole === 'investor' ? 'Agent' : 'Investor'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupMessagesByDate().map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <div className="text-center">
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {new Date(group.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              {group.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      msg.sender_id === currentUserId
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === currentUserId ? 'text-blue-200' : 'text-gray-500'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="border-t p-3">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={`p-2 rounded-full ${
                !newMessage.trim() || isSending ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 