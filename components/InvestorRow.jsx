import { supabase, isUserAuthenticated } from '../utils/supabaseClient';

const handleMessageInvestor = async (investorId, investorName) => {
  console.log('Message button clicked for investor:', investorId, investorName);
  
  if (!investorId) {
    console.error("No investor ID provided!");
    alert("Error: Missing investor ID");
    return;
  }
  
  try {
    // First check if user is authenticated using our improved function
    const authenticated = await isUserAuthenticated();
    
    if (!authenticated) {
      console.log("Not authenticated - redirect to login");
      alert("You need to log in to message investors");
      window.location.href = "/auth/login";
      return;
    }
    
    // Get user details
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user (agent):", user.id);
    
    // Check for existing conversation
    console.log('Checking for existing conversation between agent:', user.id, 'and investor:', investorId);
    const { data: existingConv, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('agent_id', user.id)
      .eq('investor_id', investorId);
    
    console.log("Existing conversation check:", existingConv, convError);
      
    if (convError) {
      console.error('Error checking for existing conversation:', convError);
      alert('Error: ' + convError.message);
      return;
    }
    
    let conversationId;
    
    if (existingConv && existingConv.length > 0) {
      // Use existing conversation
      console.log('Found existing conversation:', existingConv[0].id);
      conversationId = existingConv[0].id;
    } else {
      // Create new conversation
      console.log('Creating new conversation between agent:', user.id, 'and investor:', investorId);
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          agent_id: user.id,
          investor_id: investorId,
          created_at: new Date().toISOString()
        })
        .select('id');
      
      console.log("New conversation result:", newConv, createError);
        
      if (createError) {
        console.error('Error creating conversation:', createError);
        alert('Error: ' + createError.message);
        return;
      }
      
      if (!newConv || newConv.length === 0) {
        console.error("No conversation ID returned from insert");
        alert('Failed to create conversation - no ID returned');
        return;
      }
      
      console.log('New conversation created:', newConv[0].id);
      conversationId = newConv[0].id;
    }
    
    // Navigate to the conversation
    console.log('Navigating to conversation:', conversationId);
    
    // Add a direct database query to verify conversation exists
    const { data: checkConv, error: checkError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
      
    console.log("Conversation verification:", checkConv, checkError);
    
    // Now navigate
    window.location.href = `/messages/${conversationId}`;
    
  } catch (error) {
    console.error('Unexpected error in handleMessageInvestor:', error);
    alert('An unexpected error occurred: ' + (error.message || 'Unknown error'));
  }
};

console.log("InvestorRow component rendering for:", investor?.user_id, investor?.name);

// Button click handler with authentication check
const handleMessageButtonClick = async () => {
  try {
    console.log("Button clicked!", investor?.user_id);
    
    // Check authentication first using our improved function
    const authenticated = await isUserAuthenticated();
    if (!authenticated) {
      console.log("User not authenticated");
      alert("You need to log in to message investors");
      window.location.href = "/auth/login";
      return;
    }
    
    // If authenticated, proceed with messaging
    handleMessageInvestor(investor?.user_id, investor?.name);
  } catch (err) {
    console.error("Error in message button click:", err);
    alert("Error: " + err.message);
  }
};

<div className="flex space-x-2">
  {/* Test button - only visible in development */}
  {process.env.NODE_ENV === 'development' && (
    <button 
      onClick={() => {
        alert(`Testing communication with investor: ${investor?.name} (${investor?.user_id})`);
        console.log("Test button clicked for investor:", investor);
      }}
      className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs"
    >
      Test
    </button>
  )}
  
  {/* Main message button */}
  <button 
    onClick={handleMessageButtonClick}
    className="flex items-center space-x-1 text-green-600 hover:text-green-800"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
    <span>Message</span>
  </button>
</div> 