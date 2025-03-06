'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentPreview from '@/components/DocumentPreview';
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
  description?: string | null;
  investment_strategy?: string | null;
  target_return?: number | null;
  fund_manager?: string | null;
  fund_manager_bio?: string | null;
  fund_website?: string | null;
  fund_logo_url?: string | null;
  documents: {
    id: string;
    document_type: string;
    file_url: string;
    created_at?: string;
  }[];
  interests: {
    id: string;
    investor_name: string;
    timestamp: string;
  }[];
};

export default function FundDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const fundId = params?.id as string;
  
  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{url: string, type: string} | null>(null);

  const loadFund = async () => {
    try {
      setLoading(true);
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
          description,
          investment_strategy,
          target_return,
          fund_manager,
          fund_manager_bio,
          fund_website,
          fund_logo_url
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
        .select('id, document_type, file_url, created_at')
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false });
        
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
      const interests = (interestsData || []).map(interest => {
        // Check if investors exists and has a valid structure
        let investorName = 'Unknown Investor';
        if (interest.investors && Array.isArray(interest.investors) && interest.investors.length > 0) {
          investorName = String(interest.investors[0].name || 'Unknown Investor');
        } else if (interest.investors && typeof interest.investors === 'object' && 'name' in interest.investors) {
          investorName = String(interest.investors.name || 'Unknown Investor');
        }
        
        return {
          id: interest.id,
          investor_name: investorName,
          timestamp: interest.timestamp
        };
      });
      
      // Format the fund data
      const formattedFund = {
        ...fundData,
        documents: documents || [],
        interests: interests || []
      };
      
      setFund(formattedFund);
      setError(null);
    } catch (error: any) {
      console.error('Error loading fund:', error);
      setError(error.message || 'An error occurred while loading the fund');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only proceed if fundId is available
    if (!fundId) {
      setError('Fund ID is missing');
      setLoading(false);
      return;
    }
    
    loadFund();
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

  const renderLoading = () => {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  };

  const renderError = () => {
    return (
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
    );
  };

  const renderFund = () => {
    if (!fund) return null;
    
    return (
      <>
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
                          <div className="ml-4 flex-shrink-0 flex space-x-3">
                            <button
                              onClick={() => {
                                // Ensure the file URL is properly formatted
                                let fileUrl = document.file_url;
                                
                                // Remove any leading slashes
                                fileUrl = fileUrl.replace(/^\/+/, '');
                                
                                // Remove 'fund_documents/' prefix if it exists
                                // since the bucket name is already 'fund-documents'
                                if (fileUrl.startsWith('fund_documents/')) {
                                  fileUrl = fileUrl.replace(/^fund_documents\//, '');
                                }
                                
                                // Log the file URL for debugging
                                console.log('Opening document preview with URL:', fileUrl);
                                
                                setSelectedDocument({
                                  url: fileUrl,
                                  type: document.document_type || 'Fund Document'
                                });
                              }}
                              className="font-medium text-blue-600 hover:text-blue-500"
                            >
                              Preview
                            </button>
                            <a
                              href="#"
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  // Ensure the file URL is properly formatted
                                  let fileUrl = document.file_url;
                                  
                                  // Remove any leading slashes
                                  fileUrl = fileUrl.replace(/^\/+/, '');
                                  
                                  // Remove 'fund_documents/' prefix if it exists
                                  // since the bucket name is already 'fund-documents'
                                  if (fileUrl.startsWith('fund_documents/')) {
                                    fileUrl = fileUrl.replace(/^fund_documents\//, '');
                                  }
                                  
                                  // Log the file URL for debugging
                                  console.log('Downloading document with URL:', fileUrl);
                                  
                                  const { data, error } = await supabase.storage
                                    .from('fund-documents')
                                    .createSignedUrl(fileUrl, 3600);
                                  
                                  if (error) {
                                    console.error('Download error:', error);
                                    throw error;
                                  }
                                  
                                  // Create a temporary anchor element to trigger download
                                  const a = window.document.createElement('a');
                                  a.href = data.signedUrl;
                                  a.download = document.document_type || 'fund_document';
                                  window.document.body.appendChild(a);
                                  a.click();
                                  window.document.body.removeChild(a);
                                } catch (err) {
                                  console.error('Download error:', err);
                                  alert('Failed to download document: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                }
                              }}
                              className="font-medium text-gray-600 hover:text-gray-800"
                            >
                              Download
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <svg className="h-12 w-12 text-gray-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500">No documents available</p>
                      <Link 
                        href={`/agent/funds/${fundId}/edit`}
                        className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Upload Documents
                      </Link>
                    </div>
                  )}
                </dd>
              </div>
            </dl>
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
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Fund Details</h1>
          <div className="flex space-x-3">
            <Link
              href={`/agent/funds/${fundId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Edit Fund
            </Link>
            <button
              onClick={loadFund}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        
        <div className="py-4">
          {loading ? renderLoading() : error ? renderError() : renderFund()}
        </div>
      </div>
      
      {selectedDocument && (
        <DocumentPreview
          documentUrl={selectedDocument.url}
          documentType={selectedDocument.type}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </DashboardLayout>
  );
} 