'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type InvestorProfile = {
  user_id: string;
  name: string;
  introducing_agent_id: string | null;
  approved: boolean;
  interests?: any[];
};

type FundInterest = {
  id: string;
  timestamp: string;
  fund_id: string;
  investor_id: string;
  funds: {
    id: string;
    name: string;
    size: number;
    minimum_investment: number;
    strategy: string;
    sector_focus: string;
    geography: string;
    uploaded_by_agent_id: string;
  } | null;
};

export default function InvestorProfilePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<InvestorProfile | null>(null);
  const [interests, setInterests] = useState<FundInterest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadInvestorProfile = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated and is an agent
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Get investor profile
        const { data: investorData, error: investorError } = await supabase
          .from('investors')
          .select('*')
          .eq('user_id', params.id)
          .single();
          
        if (investorError) {
          if (investorError.code === 'PGRST116') {
            setError('Investor not found');
          } else {
            setError(investorError.message);
          }
          setLoading(false);
          return;
        }
        
        setInvestor(investorData);
        
        // Get investor's interests
        const { data: interestsData, error: interestsError } = await supabase
          .from('interests')
          .select(`
            id,
            timestamp,
            fund_id,
            investor_id,
            funds(
              id,
              name,
              size,
              minimum_investment,
              strategy,
              sector_focus,
              geography,
              uploaded_by_agent_id
            )
          `)
          .eq('investor_id', params.id)
          .order('timestamp', { ascending: false });
          
        if (interestsError) {
          console.error('Error fetching interests:', interestsError);
        } else {
          // Filter interests to only show those for funds uploaded by the current agent
          const filteredInterests = interestsData.map((interest: any) => ({
            ...interest,
            funds: interest.funds ? interest.funds : null
          })).filter((interest: FundInterest) => 
            interest.funds && interest.funds.uploaded_by_agent_id === session.user.id
          );
          setInterests(filteredInterests);
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading investor profile:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    loadInvestorProfile();
  }, [params.id, router]);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
          <Link href="/agent/investors" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
            Back to Investors
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!investor) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Investor not found
                </p>
              </div>
            </div>
          </div>
          <Link href="/agent/investors" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
            Back to Investors
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/agent/investors" className="inline-flex items-center text-sm text-primary hover:text-primary-dark">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Investors
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Investor Profile</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and interests</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center text-white text-xl font-semibold">
              {investor.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${investor.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {investor.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Interests</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {interests.length} fund{interests.length !== 1 ? 's' : ''}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Fund Interests</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Funds this investor has expressed interest in</p>
          </div>
          <div className="border-t border-gray-200">
            {interests.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {interests.map((interest) => (
                  <li key={interest.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <Link href={`/agent/funds/${interest.fund_id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary truncate">{interest.funds?.name}</p>
                          <div className="mt-2 flex">
                            <p className="flex items-center text-sm text-gray-500 mr-6">
                              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {formatCurrency(interest.funds?.size)}
                            </p>
                            <p className="flex items-center text-sm text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {interest.funds?.strategy}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(interest.timestamp)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="mt-4 text-gray-500">
                  This investor hasn't expressed interest in any of your funds yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 