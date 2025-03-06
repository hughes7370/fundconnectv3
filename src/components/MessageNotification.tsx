import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import MessageModal from '@/components/MessageModal';

interface MessageNotificationProps {
  userId: string;
  userRole: 'investor' | 'agent';
}

export default function MessageNotification({ userId, userRole }: MessageNotificationProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Determine which field to check based on user role
        const lastReadField = userRole === 'investor' ? 'investor_last_read' : 'agent_last_read';
        const userIdField = userRole === 'investor' ? 'investor_id' : 'agent_id';

        // Get conversations where the user is a participant
        const { data: userConversations, error: convError } = await supabase
          .from('conversations')
          .select(`
            id,
            investor_id,
            agent_id,
            created_at,
            investor_last_read,
            agent_last_read,
            agents:agent_id(name),
            investors:investor_id(name)
          `)
          .eq(userIdField, userId);

        if (convError) {
          throw new Error(`Error fetching conversations: ${convError.message}`);
        }

        if (!userConversations || userConversations.length === 0) {
          setConversations([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Count unread messages
        let totalUnread = 0;
        const conversationsWithData = [];

        for (const conv of userConversations) {
          // Get the last message in the conversation
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('timestamp', { ascending: false })
            .limit(5);

          if (msgError) {
            console.error(`Error fetching messages for conversation ${conv.id}:`, msgError);
            continue;
          }

          if (!messages || messages.length === 0) {
            continue; // Skip conversations with no messages
          }

          const lastMessage = messages[0];
          
          // Check if there are unread messages
          let unreadMessages = 0;
          if (lastMessage.sender_id !== userId) {
            const lastRead = conv[lastReadField];
            
            if (!lastRead) {
              // If never read, all messages from others are unread
              unreadMessages = messages.filter(msg => msg.sender_id !== userId).length;
            } else {
              // Count messages newer than last read time
              unreadMessages = messages.filter(
                msg => msg.sender_id !== userId && new Date(msg.timestamp) > new Date(lastRead)
              ).length;
            }
          }

          totalUnread += unreadMessages;

          // Get the other participant's name
          let otherParticipantName = userRole === 'investor' ? 'Agent' : 'Investor';
          
          // Try to extract the name safely using any type to bypass TypeScript errors
          try {
            if (userRole === 'investor' && conv.agents) {
              const agentData = conv.agents as any;
              if (agentData && agentData.name) {
                otherParticipantName = String(agentData.name);
              }
            } else if (userRole === 'agent' && conv.investors) {
              const investorData = conv.investors as any;
              if (investorData && investorData.name) {
                otherParticipantName = String(investorData.name);
              }
            }
          } catch (e) {
            console.error("Error extracting participant name:", e);
          }

          conversationsWithData.push({
            id: conv.id,
            otherParticipantName,
            lastMessage: lastMessage,
            unreadCount: unreadMessages
          });
        }

        // Sort conversations by those with unread messages first, then by last message time
        const sortedConversations = conversationsWithData
          .sort((a, b) => {
            // First sort by unread count (descending)
            if (b.unreadCount !== a.unreadCount) {
              return b.unreadCount - a.unreadCount;
            }
            // Then sort by last message time (descending)
            return new Date(b.lastMessage?.timestamp || 0).getTime() - 
                   new Date(a.lastMessage?.timestamp || 0).getTime();
          });

        setUnreadCount(totalUnread);
        setConversations(sortedConversations);
      } catch (err) {
        console.error('Error fetching unread messages:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadMessages();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('message-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          console.log("New message notification received:", payload.new);
          // Only update if the message is not from the current user
          if (payload.new.sender_id !== userId) {
            console.log("Message is from someone else, updating notifications");
            fetchUnreadMessages();
          }
        }
      )
      .subscribe((status) => {
        console.log("Message notification subscription status:", status);
      });

    return () => {
      console.log("Cleaning up message notification subscription");
      supabase.removeChannel(subscription);
    };
  }, [userId, userRole]);

  // Format the timestamp to a readable format
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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

  // Handle opening a conversation and marking it as read
  const handleOpenConversation = async (conversationId: string) => {
    // Update the last read timestamp
    const lastReadField = userRole === 'investor' ? 'investor_last_read' : 'agent_last_read';
    await supabase
      .from('conversations')
      .update({ [lastReadField]: new Date().toISOString() })
      .eq('id', conversationId);
    
    // Close the dropdown
    setShowDropdown(false);
    
    // Open the modal with the selected conversation
    setActiveConversationId(conversationId);
  };

  if (loading) {
    return (
      <div className="relative">
        <button className="p-2 text-gray-600 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <button className="p-2 text-red-600 hover:text-red-800" title={error}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button 
        className="p-2 text-gray-600 hover:text-gray-800 relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden">
          <div className="py-2 px-4 bg-gray-100 border-b">
            <h3 className="text-sm font-medium text-gray-700">Messages</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="py-4 px-4 text-center text-gray-500">
                <p>No messages yet</p>
              </div>
            ) : (
              <ul>
                {conversations.map((conv) => (
                  <li key={conv.id} className="border-b last:border-b-0">
                    <button 
                      onClick={() => handleOpenConversation(conv.id)}
                      className={`block w-full text-left px-4 py-3 hover:bg-gray-50 ${conv.unreadCount > 0 ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-900 truncate ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>
                            {conv.otherParticipantName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conv.lastMessage?.content || 'No messages'}
                          </p>
                        </div>
                        <div className="ml-3 flex flex-col items-end">
                          <span className="text-xs text-gray-500">
                            {formatTime(conv.lastMessage?.timestamp)}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="mt-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="py-2 px-4 bg-gray-100 border-t text-center">
            <button 
              onClick={() => setShowDropdown(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Message Modal */}
      {activeConversationId && (
        <MessageModal 
          conversationId={activeConversationId} 
          onClose={() => setActiveConversationId(null)} 
        />
      )}
    </div>
  );
} 