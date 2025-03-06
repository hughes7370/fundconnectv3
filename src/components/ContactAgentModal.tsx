import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import MessageModal from '@/components/MessageModal';

interface ContactAgentModalProps {
  agentId: string;
  agentName: string;
}

export default function ContactAgentModal({ agentId, agentName }: ContactAgentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleContactAgent = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Contact Agent button clicked for agent:", agentId);
    
    try {
      // Step 1: Check if user is authenticated
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (!session || !session.user) {
        throw new Error("You need to be logged in to contact an agent");
      }
      
      const userId = session.user.id;
      console.log("Current user:", userId);
      
      // Step 2: Check if the agent ID is valid
      if (!agentId) {
        throw new Error("No agent ID provided");
      }
      
      // Step 3: Check for existing conversation
      console.log("Checking for existing conversation between:", { investor: userId, agent: agentId });
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('investor_id', userId)
        .eq('agent_id', agentId);
        
      if (convError) {
        throw new Error(`Error checking conversations: ${convError.message}`);
      }
      
      // Step 4: Use existing conversation or create a new one
      let conversationId: string;
      
      if (existingConv && existingConv.length > 0) {
        console.log("Existing conversation found:", existingConv[0].id);
        conversationId = existingConv[0].id;
      } else {
        console.log("Creating new conversation");
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            investor_id: userId,
            agent_id: agentId,
            created_at: new Date().toISOString()
          })
          .select('id');
          
        if (createError) {
          throw new Error(`Failed to create conversation: ${createError.message}`);
        }
        
        if (!newConv || newConv.length === 0) {
          throw new Error("No conversation created");
        }
        
        console.log("New conversation created:", newConv[0].id);
        conversationId = newConv[0].id;
      }
      
      // Step 5: Open the message modal with the conversation
      setActiveConversationId(conversationId);
    } catch (err) {
      console.error("Contact Agent Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <button
        onClick={handleContactAgent}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Contact {agentName || "Agent"}
          </>
        )}
      </button>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          Error: {error}
        </div>
      )}
      
      {/* Message Modal */}
      {activeConversationId && (
        <MessageModal 
          conversationId={activeConversationId} 
          onClose={() => setActiveConversationId(null)} 
        />
      )}
    </>
  );
} 