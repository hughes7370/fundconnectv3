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
  agent: {
    name: string;
    firm: string;
  };
  documents: {
    id: string;
    document_type: string;
    file_url: string;
  }[];
};

export default function FundDetail() {
  const params = useParams();
  const fundId = params.id as string;
  const router = useRouter();
  
  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);

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
            created_at,
            agents:uploaded_by_agent_id(
              user_id,
              name,
              firm
            )
          `)
          .eq('id', fundId)
          .single();
          
        if (fundError) throw fundError;
        
        // Load fund documents
        const { data: documents, error: documentsError } = await supabase
          .from('fund_documents')
          .select('id, document_type, file_url')
          .eq('fund_id', fundId);
          
        if (documentsError) throw documentsError;
        
        // Check if the investor has already expressed interest
        const { data: interests, error: interestsError } = await supabase
          .from('interests')
          .select('id')
          .eq('fund_id', fundId)
          .eq('investor_id', session.user.id)
          .single();
          
        if (interestsError && interestsError.code !== 'PGRST116') {
          throw interestsError;
        }
        
        setHasExpressedInterest(!!interests);
        
        // Format the fund data
        const formattedFund = {
          ...fundData,
          agent: fundData.agents,
          documents: documents || [],
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

  const handleExpressInterest = async () => {
    try {
      setExpressingInterest(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      // Create an interest record
      const { error } = await supabase
        .from('interests')
        .insert([
          {
            investor_id: session.user.id,
            fund_id: fundId,
          },
        ]);
        
      if (error) throw error;
      
      setHasExpressedInterest(true);
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      alert('An error occurred while expressing interest. Please try again.');
    } finally {
      setExpressingInterest(false);
    }
  };

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

  const renderLoading = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  const renderError = () => (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
          <div className="mt-4">
            <Link
              href="/investor/funds"
              className="text-sm font-medium text-red-800 hover:text-red-700"
            >
              ← Back to Funds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFund = () => {
    if (!fund) return null;
    
    return (
      <>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {fund.name}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {fund.strategy} • {fund.sector_focus} • {fund.geography}
              </p>
            </div>
            
            <div>
              {hasExpressedInterest ? (
                <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600">
                  <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Interest Expressed
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExpressInterest}
                  disabled={expressingInterest}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {expressingInterest ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Express Interest
                    </>
                  )}
                </button>
              )}
            </div>
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
                  Manager
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.agent?.name} ({fund.agent?.firm})
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Track Record
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.track_record_irr !== null ? `${fund.track_record_irr.toFixed(1)}% IRR` : 'N/A'}
                  {fund.track_record_moic !== null ? ` • ${fund.track_record_moic.toFixed(1)}x MOIC` : ''}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Terms
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.management_fee}% Management Fee • {fund.carry}% Carry
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Team Background
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.team_background}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
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
                              className="font-medium text-primary hover:text-primary-dark"
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

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/investor/funds"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Funds
          </Link>
          
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg className="mr-1.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ask a Question
          </button>
        </div>
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
        
        <div className="py-4">
          {loading ? renderLoading() : error ? renderError() : renderFund()}
        </div>
      </div>
    </DashboardLayout>
  );
} 