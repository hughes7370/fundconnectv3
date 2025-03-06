import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import ContactAgentButton from '../../components/ContactAgentButton';

export default function FundDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchFund() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('funds')
          .select(`
            *,
            agent:agent_id (
              id,
              name,
              profile_image
            )
          `)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setFund(data);
      } catch (error) {
        console.error('Error fetching fund:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFund();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading fund details...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  if (!fund) {
    return <div className="p-8 text-center">Fund not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{fund.name}</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Fund Details</h2>
            <p className="mb-2"><span className="font-medium">Type:</span> {fund.type}</p>
            <p className="mb-2"><span className="font-medium">Size:</span> ${fund.size?.toLocaleString()}</p>
            <p className="mb-2"><span className="font-medium">Minimum Investment:</span> ${fund.minimum_investment?.toLocaleString()}</p>
            <p className="mb-2"><span className="font-medium">Status:</span> {fund.status}</p>
            <p className="mb-4"><span className="font-medium">Description:</span> {fund.description}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Fund Manager</h2>
            {fund.agent && (
              <div className="flex items-center mb-4">
                {fund.agent.profile_image && (
                  <img 
                    src={fund.agent.profile_image} 
                    alt={fund.agent.name} 
                    className="w-16 h-16 rounded-full mr-4 object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-lg">{fund.agent.name}</p>
                  <ContactAgentButton 
                    agentId={fund.agent_id} 
                    agentName={fund.agent.name || "Agent"} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={() => router.back()}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
      >
        Back to Funds
      </button>
    </div>
  );
} 