'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

interface Interest {
  id: string;
  fund: {
    id: string;
    name: string;
    size: number;
    strategy: string;
    sector_focus: string;
    geography: string;
    agent: {
      name: string;
      firm: string;
    };
  };
  timestamp: string;
}

export default function InvestorInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadInterests = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Load interests with fund details
        const { data, error: interestsError } = await supabase
          .from('interests')
          .select(`
            id,
            timestamp,
            fund:fund_id (
              id,
              name,
              size,
              strategy,
              sector_focus,
              geography,
              agent:uploaded_by_agent_id (
                name,
                firm
              )
            )
          `)
          .eq('investor_id', session.user.id)
          .order('timestamp', { ascending: false });
          
        if (interestsError) throw interestsError;
        
        // Transform the data to match our Interest interface
        const formattedInterests: Interest[] = data?.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          fund: {
            id: item.fund.id,
            name: item.fund.name,
            size: item.fund.size,
            strategy: item.fund.strategy,
            sector_focus: item.fund.sector_focus,
            geography: item.fund.geography,
            agent: {
              name: item.fund.agent.name,
              firm: item.fund.agent.firm
            }
          }
        })) || [];
        
        setInterests(formattedInterests);
      } catch (error: any) {
        console.error('Error loading interests:', error);
        setError(error.message || 'An error occurred while loading your interests');
      } finally {
        setLoading(false);
      }
    };
    
    loadInterests();
  }, [router]);

  const formatCurrency = (amount: number) => {
    // Format large numbers with appropriate suffix (M, B)
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRemoveInterest = async (interestId: string) => {
    if (!confirm('Are you sure you want to remove your interest in this fund?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('interests')
        .delete()
        .eq('id', interestId);
        
      if (error) throw error;
      
      // Update the UI by removing the deleted interest
      setInterests(interests.filter(interest => interest.id !== interestId));
    } catch (error: any) {
      console.error('Error removing interest:', error);
      alert('An error occurred while removing your interest. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Interests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Funds you have expressed interest in.
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-sm text-gray-500">Loading your interests...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading interests</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : interests.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No interests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't expressed interest in any funds yet.
                </p>
                <div className="mt-6">
                  <Link href="/investor/funds" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Browse Funds
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {interests.map((interest) => (
                  <li key={interest.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-3">
                            <p className="text-sm font-medium text-primary truncate">
                              <Link href={`/investor/funds/${interest.fund.id}`} className="hover:underline">
                                {interest.fund.name}
                              </Link>
                            </p>
                            <p className="mt-1 flex items-center text-sm text-gray-500">
                              <span>{interest.fund.agent.name} ({interest.fund.agent.firm})</span>
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Interested on {formatDate(interest.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <span className="mr-1.5 font-medium">Size:</span> {formatCurrency(interest.fund.size)}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <span className="mr-1.5 font-medium">Strategy:</span> {interest.fund.strategy}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <span className="mr-1.5 font-medium">Sector:</span> {interest.fund.sector_focus}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <span className="mr-1.5 font-medium">Geography:</span> {interest.fund.geography}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <button
                            onClick={() => handleRemoveInterest(interest.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Remove Interest
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 