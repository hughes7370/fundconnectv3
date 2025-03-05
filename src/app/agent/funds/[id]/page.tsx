'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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
  track_record_irr: number | null;
  track_record_moic: number | null;
  team_background: string;
  management_fee: number;
  carry: number;
  created_at: string;
  documents: {
    id: string;
    document_type: string;
    file_url: string;
  }[];
  interests: {
    id: string;
    investor_name: string;
    timestamp: string;
  }[];
};

export default function FundDetail() {
  const params = useParams();
  const fundId = params.id as string;
  const router = useRouter();
  
  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFund = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Load fund details
        const { data: fundData, error: fundError } = await supabase
          .from('funds')
          .select(`
            id,
            name,
            size,
            minimum_investment,
            strategy,
            sector_focus,
            geography,
            track_record_irr,
            track_record_moic,
            team_background,
            management_fee,
            carry,
            created_at
          `)
          .eq('id', fundId)
          .eq('uploaded_by_agent_id', session.user.id)
          .single();
          
        if (fundError) {
          if (fundError.message.includes('relation') || fundError.message.includes('table')) {
            throw new Error('Database tables not set up. Please run the schema.sql script in your Supabase project.');
          }
          throw fundError;
        }
        
        // Load fund documents
        const { data: documents, error: documentsError } = await supabase
          .from('fund_documents')
          .select('id, document_type, file_url')
          .eq('fund_id', fundId);
          
        if (documentsError && !documentsError.message.includes('relation') && !documentsError.message.includes('table')) {
          throw documentsError;
        }
        
        // Load interests for this fund
        const { data: interestsData, error: interestsError } = await supabase
          .from('interests')
          .select(`
            id,
            timestamp,
            investors:investor_id (
              user_id,
              name
            )
          `)
          .eq('fund_id', fundId);
          
        if (interestsError && !interestsError.message.includes('relation') && !interestsError.message.includes('table')) {
          throw interestsError;
        }
        
        // Format interests data
        const interests = (interestsData || []).map(interest => ({
          id: interest.id,
          investor_name: interest.investors?.name || 'Unknown Investor',
          timestamp: interest.timestamp
        }));
        
        // Format the fund data
        const formattedFund = {
          ...fundData,
          documents: documents || [],
          interests: interests || []
        };
        
        setFund(formattedFund);
      } catch (error: any) {
        console.error('Error loading fund:', error);
        setError(error.message || 'An error occurred while loading the fund');
      } finally {
        setLoading(false);
      }
    };
    
    if (fundId) {
      loadFund();
    }
  }, [fundId, router]);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
          <div className="py-4">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
          <div className="py-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  <div className="mt-4">
                    <Link
                      href="/agent/funds"
                      className="text-sm font-medium text-red-800 hover:text-red-700"
                    >
                      ← Back to Funds
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!fund) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
          <div className="py-4">
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Fund not found</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    The fund you're looking for doesn't exist or you don't have permission to view it.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/agent/funds"
                      className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
                    >
                      ← Back to Funds
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
          <div className="flex space-x-4">
            <Link
              href={`/agent/funds/${fund.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Fund
            </Link>
            <Link
              href="/agent/funds"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Funds
            </Link>
          </div>
        </div>
        
        <div className="py-4">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {fund.name}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {fund.strategy} • {fund.sector_focus} • {fund.geography}
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Fund Size
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatCurrency(fund.size)}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Minimum Investment
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatCurrency(fund.minimum_investment)}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Track Record
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.track_record_irr !== null ? `${fund.track_record_irr.toFixed(1)}% IRR` : 'N/A'}
                    {fund.track_record_moic !== null ? ` • ${fund.track_record_moic.toFixed(1)}x MOIC` : ''}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Terms
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.management_fee}% Management Fee • {fund.carry}% Carry
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Team Background
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.team_background}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Documents
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.documents.length > 0 ? (
                      <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                        {fund.documents.map((document) => (
                          <li
                            key={document.id}
                            className="pl-3 pr-4 py-3 flex items-center justify-between text-sm"
                          >
                            <div className="w-0 flex-1 flex items-center">
                              <svg
                                className="flex-shrink-0 h-5 w-5 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="ml-2 flex-1 w-0 truncate">
                                {document.document_type || 'Fund Document'}
                              </span>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <a
                                href="#"
                                className="font-medium text-blue-600 hover:text-blue-500"
                              >
                                Download
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No documents available</p>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Investor Interest</h2>
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
              {fund.interests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Investor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="relative px-6 py-3"
                        >
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fund.interests.map((interest) => (
                        <tr key={interest.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {interest.investor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(interest.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Interested
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-blue-600 hover:text-blue-900">
                              Contact
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No investor interest yet. When investors express interest in this fund, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 