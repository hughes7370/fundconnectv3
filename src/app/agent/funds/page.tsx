'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type Fund = {
  id: string;
  name: string;
  size: number;
  minimum_investment: number;
  strategy: string;
  sector_focus: string;
  geography: string;
  created_at: string;
  interest_count: number;
};

export default function AgentFunds() {
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadFunds = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Load funds uploaded by this agent
        const { data, error } = await supabase
          .from('funds')
          .select(`
            id,
            name,
            size,
            minimum_investment,
            strategy,
            sector_focus,
            geography,
            created_at
          `)
          .eq('uploaded_by_agent_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          if (error.message.includes('relation') || error.message.includes('table')) {
            throw new Error('Database tables not set up. Please run the schema.sql script in your Supabase project.');
          }
          throw error;
        }
        
        // For each fund, get the count of interests
        const fundsWithInterests = await Promise.all(
          (data || []).map(async (fund) => {
            try {
              const { count, error: countError } = await supabase
                .from('interests')
                .select('id', { count: 'exact', head: true })
                .eq('fund_id', fund.id);
                
              if (countError) {
                console.error('Error getting interest count:', countError);
                return { ...fund, interest_count: 0 };
              }
              
              return { ...fund, interest_count: count || 0 };
            } catch (err) {
              console.error('Error processing fund interests:', err);
              return { ...fund, interest_count: 0 };
            }
          })
        );
        
        setFunds(fundsWithInterests);
      } catch (error: any) {
        console.error('Error loading funds:', error);
        setError(error.message || 'An error occurred while loading funds');
      } finally {
        setLoading(false);
      }
    };
    
    loadFunds();
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
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">My Funds</h1>
          <Link
            href="/agent/funds/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New Fund
          </Link>
        </div>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  {error.includes('Database tables') && (
                    <div className="mt-4">
                      <p className="text-sm text-red-700">
                        Please set up the database tables by running the SQL script in your Supabase project.
                      </p>
                      <Link 
                        href="/dashboard" 
                        className="mt-3 inline-flex items-center text-sm font-medium text-red-700 hover:text-red-600"
                      >
                        Return to Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : funds.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No funds</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading a new fund.
              </p>
              <div className="mt-6">
                <Link
                  href="/agent/funds/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload New Fund
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Fund Name
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Size
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Strategy
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Sector
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Uploaded
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Interests
                          </th>
                          <th
                            scope="col"
                            className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                          >
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {funds.map((fund) => (
                          <tr key={fund.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              <Link href={`/agent/funds/${fund.id}`} className="text-blue-600 hover:text-blue-900">
                                {fund.name}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {formatCurrency(fund.size)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {fund.strategy}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {fund.sector_focus}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {formatDate(fund.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {fund.interest_count}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Link href={`/agent/funds/${fund.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-4">
                                Edit
                              </Link>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this fund?')) {
                                    // Handle delete
                                    const deleteFund = async () => {
                                      try {
                                        setLoading(true);
                                        const { error } = await supabase
                                          .from('funds')
                                          .delete()
                                          .eq('id', fund.id);
                                          
                                        if (error) throw error;
                                        
                                        // Remove the fund from the state
                                        setFunds(funds.filter(f => f.id !== fund.id));
                                        
                                      } catch (error: any) {
                                        console.error('Error deleting fund:', error);
                                        alert(`Error deleting fund: ${error.message}`);
                                      } finally {
                                        setLoading(false);
                                      }
                                    };
                                    
                                    deleteFund();
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 