'use client';

import React, { useState, useEffect } from 'react';
import InviteInvestorModal from './InviteInvestorModal';
import MessageModal from '@/components/MessageModal';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

interface Investor {
  user_id: string;
  name: string;
  approved: boolean;
  interests_count?: number;
  is_pending?: boolean;
  email?: string;
  invitation_code?: string;
}

interface InvestorsClientProps {
  investors: Investor[];
}

export default function InvestorsClient({ investors }: InvestorsClientProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayInvestors, setDisplayInvestors] = useState<Investor[]>(investors);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const router = useRouter();
  
  // Fetch investors when refreshTrigger changes
  useEffect(() => {
    const fetchInvestors = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        // Fetch registered investors associated with this agent
        const { data: registeredInvestors, error: registeredError } = await supabase
          .from('investors')
          .select('*')
          .eq('introducing_agent_id', session.user.id);
          
        if (registeredError) {
          console.error('Error fetching registered investors:', registeredError);
          throw registeredError;
        }
        
        // Fetch pending investors associated with this agent
        const { data: pendingInvestors, error: pendingError } = await supabase
          .from('pending_investors')
          .select('*')
          .eq('agent_id', session.user.id)
          .eq('registered', false);
          
        if (pendingError) {
          console.error('Error fetching pending investors:', pendingError);
          throw pendingError;
        }
        
        // Transform pending investors to match the Investor interface
        const transformedPendingInvestors: Investor[] = pendingInvestors.map(pending => ({
          user_id: pending.id, // Use the pending investor's ID as a temporary user_id
          name: pending.name,
          approved: false,
          interests_count: 0,
          is_pending: true,
          email: pending.email,
          invitation_code: pending.invitation_code
        }));
        
        // Combine registered and pending investors
        const allInvestors = [...registeredInvestors, ...transformedPendingInvestors];
        
        // For each registered investor, fetch their interests count
        const investorsWithInterests = await Promise.all(
          allInvestors.map(async (investor) => {
            if (investor.is_pending) {
              return investor; // Pending investors have 0 interests
            }
            
            const { count, error: countError } = await supabase
              .from('interests')
              .select('*', { count: 'exact', head: true })
              .eq('investor_id', investor.user_id);
              
            return {
              ...investor,
              interests_count: countError ? 0 : (count || 0)
            };
          })
        );
        
        console.log('All investors with interests:', investorsWithInterests);
        setDisplayInvestors(investorsWithInterests);
      } catch (error) {
        console.error('Error fetching investors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvestors();
  }, [refreshTrigger]);
  
  // Handle search functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term.trim()) {
      // If search is cleared, refresh the data to get the interests count
      setRefreshTrigger(prev => prev + 1);
    } else {
      const filtered = displayInvestors.filter(investor => 
        investor.name.toLowerCase().includes(term) || 
        (investor.email && investor.email.toLowerCase().includes(term))
      );
      setDisplayInvestors(filtered);
    }
  };
  
  // Handle invite success (refresh the data without reloading the page)
  const handleInviteSuccess = () => {
    // Increment the refresh trigger to fetch updated data
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle view investor profile
  const handleViewInvestor = (investor: Investor) => {
    if (investor.is_pending) {
      alert('This investor has not registered yet. They need to complete registration using the invitation code.');
      return;
    }
    
    // Navigate to investor profile page
    router.push(`/agent/investors/${investor.user_id}`);
  };
  
  // Handle message investor
  const handleMessageInvestor = async (investor: Investor) => {
    if (investor.is_pending) {
      alert('This investor has not registered yet. They need to complete registration before you can message them.');
      return;
    }
    
    try {
      // Get current user (agent)
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (!session || !session.user) {
        alert('You need to be logged in to message investors.');
        return;
      }
      
      const agentId = session.user.id;
      const investorId = investor.user_id;
      
      if (!investorId) {
        alert('Invalid investor information. Please try again.');
        return;
      }
      
      console.log('Checking for existing conversation between agent:', agentId, 'and investor:', investorId);
      
      // Check for existing conversation
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('investor_id', investorId);
      
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
        console.log('Creating new conversation between agent:', agentId, 'and investor:', investorId);
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            agent_id: agentId,
            investor_id: investorId,
            created_at: new Date().toISOString()
          })
          .select('id');
        
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
      
      // Open the message modal with the conversation ID
      setActiveConversationId(conversationId);
      
    } catch (error) {
      console.error('Error in message investor:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };
  
  // Handle remove investor
  const handleRemoveInvestor = async (investor: Investor) => {
    // Confirm before removing
    if (!confirm(`Are you sure you want to remove ${investor.name} from your investors?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (investor.is_pending) {
        // Remove pending investor
        const { error } = await supabase
          .from('pending_investors')
          .delete()
          .eq('id', investor.user_id);
          
        if (error) throw error;
      } else {
        // Update the investor record to remove the introducing_agent_id
        const { error } = await supabase
          .from('investors')
          .update({ introducing_agent_id: null, approved: false })
          .eq('user_id', investor.user_id);
          
        if (error) throw error;
      }
      
      // Refresh the investors list
      setRefreshTrigger(prev => prev + 1);
      
      alert(`${investor.name} has been removed from your investors.`);
    } catch (error) {
      console.error('Error removing investor:', error);
      alert('Failed to remove investor. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get status display text
  const getStatusText = (investor: Investor) => {
    if (investor.is_pending) {
      return 'Pending Registration';
    }
    return investor.approved ? 'Approved' : 'Pending Approval';
  };
  
  // Get status class
  const getStatusClass = (investor: Investor) => {
    if (investor.is_pending) {
      return 'bg-blue-100 text-blue-800';
    }
    return investor.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Investors</h1>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          onClick={() => setIsInviteModalOpen(true)}
          disabled={loading}
        >
          Invite New Investor
        </button>
      </div>
      
      {/* Search and filter section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <input
          type="text"
          placeholder="Search investors by name or email..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      {/* Investors table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interests</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayInvestors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm ? 'No investors match your search.' : 'No investors found. Invite some investors to get started.'}
                </td>
              </tr>
            ) : (
              displayInvestors.map((investor) => (
                <tr key={investor.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div 
                        className={`text-sm font-medium ${investor.is_pending ? 'text-gray-900' : 'text-blue-600 hover:text-blue-800 cursor-pointer'}`}
                        onClick={() => !investor.is_pending && handleViewInvestor(investor)}
                      >
                        {investor.name}
                      </div>
                      {investor.email && (
                        <div className="text-xs text-gray-500 mt-1">
                          {investor.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(investor)}`}>
                      {getStatusText(investor)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {investor.interests_count || 0} {(investor.interests_count === 1) ? 'interest' : 'interests'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-4">
                      {!investor.is_pending && (
                        <>
                          <button 
                            onClick={() => handleViewInvestor(investor)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            disabled={loading}
                            title="View investor profile"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button 
                            onClick={() => handleMessageInvestor(investor)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            disabled={loading}
                            title="Message investor"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Message
                          </button>
                        </>
                      )}
                      {investor.is_pending && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(investor.invitation_code || '');
                            alert('Invitation code copied to clipboard!');
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          disabled={loading}
                          title="Copy invitation code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy Code
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveInvestor(investor)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                        disabled={loading}
                        title="Remove investor"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Invite Modal */}
      <InviteInvestorModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSuccess={handleInviteSuccess}
      />
      
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