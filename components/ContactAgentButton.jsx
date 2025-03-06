import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ContactAgentButton({ agentId, agentName }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleContactAgent = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Contact Agent button clicked for agent:", agentId);
    
    try {
      // Step 1: Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!user) {
        console.log("No user logged in, redirecting to login");
        router.push('/login?redirect=' + router.asPath);
        return;
      }
      
      console.log("Current user:", user.id);
      
      // Step 2: Check if the agent ID is valid
      if (!agentId) {
        throw new Error("No agent ID provided");
      }
      
      // Step 3: Check for existing conversation
      console.log("Checking for existing conversation between:", { investor: user.id, agent: agentId });
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('investor_id', user.id)
        .eq('agent_id', agentId);
        
      if (convError) {
        throw new Error(`Error checking conversations: ${convError.message}`);
      }
      
      // Step 4: Navigate to existing conversation or create a new one
      if (existingConv && existingConv.length > 0) {
        console.log("Existing conversation found:", existingConv[0].id);
        router.push(`/messages/${existingConv[0].id}`);
      } else {
        console.log("Creating new conversation");
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            investor_id: user.id,
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
        router.push(`/messages/${newConv[0].id}`);
      }
    } catch (error) {
      console.error("Contact Agent Error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleContactAgent}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isLoading ? "Connecting..." : `Contact ${agentName || "Agent"}`}
      </button>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          Error: {error}
        </div>
      )}
    </div>
  );
} 