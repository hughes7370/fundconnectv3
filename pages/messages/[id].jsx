import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase, isUserAuthenticated, getCurrentUser, getUserRole } from '../../utils/supabaseClient';
import Link from 'next/link';

export default function ConversationDetail() {
  const router = useRouter();
  const { id: conversationId } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef(null);

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
        
        // Use the improved authentication check
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          console.log("No active session - user not logged in");
          setIsLoading(false);
          return;
        }
        
        // Get user details
        const user = await getCurrentUser();
        
        if (!user) {
          console.log("No user found via getCurrentUser, checking localStorage");
          
          // Last resort - check localStorage directly
          try {
            const authToken = localStorage.getItem('supabase.auth.token');
            if (authToken) {
              const parsedToken = JSON.parse(authToken);
              if (parsedToken?.currentSession?.user?.id) {
                const userId = parsedToken.currentSession.user.id;
                console.log("Found user ID in localStorage:", userId);
                setCurrentUserId(userId);
                
                // Check user role using our new function
                const roleInfo = await getUserRole(userId);
                if (roleInfo) {
                  console.log(`User is a ${roleInfo.role}:`, roleInfo.data);
                  setUserRole(roleInfo.role);
                  setIsLoading(false);
                  return;
                } else {
                  console.log("User has no role assigned");
                  setError("You don't have permission to view this conversation");
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (e) {
            console.error("Error checking localStorage:", e);
          }
          
          console.log("No user found in session");
          setIsAuthenticated(false);
          setError("You need to be logged in to view this conversation");
          setIsLoading(false);
          return;
        }
        
        console.log("User authenticated:", user.id);
        setCurrentUserId(user.id);
        
        // Check user role using our new function
        const roleInfo = await getUserRole(user.id);
        if (roleInfo) {
          console.log(`User is a ${roleInfo.role}:`, roleInfo.data);
          setUserRole(roleInfo.role);
        } else {
          console.log("User has no role assigned");
          setError("You don't have permission to view this conversation");
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Load conversation data when authenticated and role is determined
  useEffect(() => {
    if (!conversationId || !isAuthenticated || !currentUserId || !userRole) return;
    
    const fetchConversation = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching conversation:", conversationId);
        // Fetch the conversation details
        let { data: conversation, error: convError } = await supabase
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
          console.error("Error loading conversation:", convError);
          
          // Try a direct API call as a fallback
          try {
            console.log("Trying direct API call to get conversation");
            const response = await fetch(`/api/get-conversation?id=${conversationId}`);
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            const apiConversation = await response.json();
            if (apiConversation) {
              console.log("Got conversation from API:", apiConversation);
              conversation = apiConversation;
            } else {
              throw new Error("Conversation not found");
            }
          } catch (apiError) {
            console.error("API fallback failed:", apiError);
            throw new Error(`Error loading conversation: ${convError.message}`);
          }
        }
        
        if (!conversation) {
          throw new Error("Conversation not found");
        }
        
        console.log("Conversation data:", conversation);
        
        // Check if user is part of this conversation
        if (userRole === 'investor' && conversation.investor_id !== currentUserId) {
          throw new Error("You don't have permission to view this conversation");
        } else if (userRole === 'agent' && conversation.agent_id !== currentUserId) {
          throw new Error("You don't have permission to view this conversation");
        }
        
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
      } catch (err) {
        console.error("Error in conversation detail:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversation();
  }, [conversationId, isAuthenticated, currentUserId, userRole]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up real-time subscription for new messages");
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, 
        (payload) => {
          console.log("New message received:", payload.new);
          setMessages(prev => [...prev, payload.new]);
          
          // Mark as read if message is from other user
          if (payload.new.sender_id !== currentUserId && userRole) {
            const lastReadField = userRole === 'investor' ? 'investor_last_read' : 'agent_last_read';
            supabase
              .from('conversations')
              .update({ [lastReadField]: new Date().toISOString() })
              .eq('id', conversationId);
          }
        }
      )
      .subscribe();
      
    return () => {
      console.log("Unsubscribing from real-time updates");
      supabase.removeChannel(subscription);
    };
  }, [conversationId, currentUserId, userRole]);

  // Send message function
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUserId || !conversationId) return;
    
    setIsSending(true);
    
    try {
      console.log("Sending new message");
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: newMessage.trim(),
          timestamp: new Date().toISOString()
        });
        
      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
      
      console.log("Message sent successfully");
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Format message timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
  };
  
  const messageGroups = groupMessagesByDate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="ml-3 text-gray-600">Loading conversation...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-medium mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">You need to log in to view and send messages.</p>
          <Link href="/auth/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-medium mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/messages" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center">
          <Link href="/messages" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-medium">{otherUser?.name || 'Conversation'}</h1>
          </div>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messageGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="p-6 max-w-sm">
                <p className="text-gray-500 mb-4">No messages yet</p>
                <p className="text-sm text-gray-400">
                  Send a message to start the conversation
                </p>
              </div>
            </div>
          ) : (
            messageGroups.map(group => (
              <div key={group.date} className="mb-6">
                <div className="text-center mb-4">
                  <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {group.date}
                  </span>
                </div>
                
                {group.messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`flex mb-3 ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender_id === currentUserId 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white border rounded-bl-none'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.sender_id === currentUserId ? 'text-blue-200' : 'text-gray-500'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="bg-white border-t p-3">
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