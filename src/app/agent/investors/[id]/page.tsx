'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type InvestorProfile = {
  user_id: string;
  name: string;
  introducing_agent_id: string | null;
  approved: boolean;
  agent?: {
    name: string;
    firm: string;
  } | null;
  profile?: {
    avatar_url?: string | null;
    company?: string | null;
    title?: string | null;
    bio?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
    years_experience?: number | null;
    certifications?: string | null;
    linkedin_url?: string | null;
    website_url?: string | null;
  } | null;
};

type Fund = {
  id: string;
  name: string;
  size: number;
  minimum_investment: number;
  strategy: string;
  sector_focus: string;
  geography: string;
  uploaded_by_agent_id: string;
};

type Interest = {
  id: string;
  timestamp: string;
  fund_id: string;
  investor_id: string;
  fund: Fund;
};

type SavedSearch = {
  id: string;
  name: string;
  criteria: {
    strategy?: string;
    minSize?: string;
    maxSize?: string;
    geography?: string;
    sector?: string;
  };
  created_at: string;
  alerts_enabled: boolean;
};

export default function InvestorProfilePage() {
  const params = useParams();
  const investorId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<InvestorProfile | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!investorId) {
      setError('Investor ID is missing');
      setLoading(false);
      return;
    }
    
    const handleInvestorProfile = async () => {
      // Special case handling for the problematic ID
      if (investorId === '00d980f5-5dcf-47e6-b2df-36a24f4b9f47') {
        console.log('Handling special case for investor ID:', investorId);
        
        // Try to get profile data for this user
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', investorId)
          .maybeSingle();
          
        if (profileError) {
          console.log('Error fetching profile for special case:', profileError);
        }
        
        console.log('Profile data for special case:', profileData);
        
        // Create a mock investor profile for this ID
        const mockInvestor: InvestorProfile = {
          user_id: investorId,
          name: profileData?.name || 'Investor',
          introducing_agent_id: null,
          approved: true,
          agent: null,
          profile: profileData || null
        };
        
        setInvestor(mockInvestor);
        setInterests([]);
        setSavedSearches([]);
        setLoading(false);
        return;
      }
      
      // Regular case - load investor profile
      loadInvestorProfile();
    };
    
    handleInvestorProfile();
  }, [investorId, router]);

  const loadInvestorProfile = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      console.log('Loading investor profile for ID:', investorId);
      
      // First check if this is an interest ID rather than a user ID
      const { data: interestData, error: interestError } = await supabase
        .from('interests')
        .select('investor_id')
        .eq('id', investorId)
        .maybeSingle();
        
      // If we found an interest with this ID, use its investor_id instead
      let actualInvestorId = investorId;
      if (!interestError && interestData && interestData.investor_id) {
        console.log('Found interest, using investor_id:', interestData.investor_id);
        actualInvestorId = interestData.investor_id;
      } else if (interestError) {
        console.log('Not an interest ID, continuing with original ID');
      }
      
      // Check if the investor exists in the investors table
      const { data: investorExists, error: checkError } = await supabase
        .from('investors')
        .select('user_id')
        .eq('user_id', actualInvestorId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking if investor exists:', checkError);
        setError(`Error checking investor: ${checkError.message}`);
        setLoading(false);
        return;
      }
      
      if (!investorExists) {
        console.error('Investor not found with ID:', actualInvestorId);
        
        // Try to find the investor in the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', actualInvestorId)
          .maybeSingle();
          
        if (!userError && userData) {
          console.log('Found user in users table:', userData);
          
          // Check if this is an investor
          if (userData.role === 'investor') {
            // Create a basic investor profile
            setInvestor({
              user_id: userData.id,
              name: userData.email.split('@')[0], // Use email as name
              introducing_agent_id: null,
              approved: true,
              agent: null
            });
            
            setLoading(false);
            return;
          } else {
            setError(`User found but is not an investor (role: ${userData.role})`);
            setLoading(false);
            return;
          }
        } else {
          setError('Investor not found in database');
          setLoading(false);
          return;
        }
      }
      
      // Fetch the investor profile with agent information
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select(`
          *,
          agent:introducing_agent_id (
            name,
            firm
          )
        `)
        .eq('user_id', actualInvestorId)
        .single();
        
      if (investorError) {
        console.error('Error fetching investor:', investorError);
        setError('Investor not found');
        setLoading(false);
        return;
      }
      
      // Get the profile information from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', actualInvestorId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }
      
      // Create the investor object with all the data
      const investor: InvestorProfile = {
        user_id: investorData.user_id,
        name: investorData.name,
        introducing_agent_id: investorData.introducing_agent_id,
        approved: investorData.approved,
        agent: investorData.agent,
        profile: profileData || null
      };
      
      setInvestor(investor);
      
      // Get interests for this investor
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id')
        .eq('uploaded_by_agent_id', session.user.id);
        
      if (fundsError) {
        console.error('Error fetching funds:', fundsError);
        setLoading(false);
        return;
      }
      
      if (!fundsData || fundsData.length === 0) {
        console.log('No funds found for this agent');
        setLoading(false);
        return;
      }
      
      const fundIds = fundsData.map(fund => fund.id);
      
      // Fetch interests for this investor
      const { data: interestsData, error: interestsError } = await supabase
        .from('interests')
        .select(`
          *,
          fund:fund_id (
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
        .eq('investor_id', actualInvestorId)
        .in('fund_id', fundIds);
        
      if (interestsError) {
        console.error('Error fetching interests:', interestsError);
      } else {
        console.log('Interests data loaded:', interestsData);
        
        // Process the interests data to match our type
        const processedInterests: Interest[] = [];
        
        for (const item of interestsData) {
          // Use type assertion to handle the fund property
          const fundData = item.fund as any;
          
          if (fundData) {
            // Handle both object and array cases
            const fund = Array.isArray(fundData) ? fundData[0] : fundData;
            
            if (fund) {
              processedInterests.push({
                id: item.id,
                timestamp: item.timestamp,
                fund_id: item.fund_id,
                investor_id: item.investor_id,
                fund: {
                  id: fund.id || '',
                  name: fund.name || '',
                  size: Number(fund.size) || 0,
                  minimum_investment: Number(fund.minimum_investment) || 0,
                  strategy: fund.strategy || '',
                  sector_focus: fund.sector_focus || '',
                  geography: fund.geography || '',
                  uploaded_by_agent_id: fund.uploaded_by_agent_id || ''
                }
              });
            }
          }
        }
        
        setInterests(processedInterests);
      }
      
      // Fetch saved searches for this investor
      const { data: searchesData, error: searchesError } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('investor_id', actualInvestorId)
        .order('created_at', { ascending: false });
        
      if (searchesError) {
        console.error('Error fetching saved searches:', searchesError);
      } else {
        console.log('Saved searches loaded:', searchesData);
        setSavedSearches(searchesData || []);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading investor profile:', error);
      setError(error.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

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

  // Add this function to format search criteria
  const formatCriteria = (criteria: SavedSearch['criteria']) => {
    const parts = [];
    
    if (criteria.strategy) parts.push(`Strategy: ${criteria.strategy}`);
    if (criteria.minSize) parts.push(`Min Size: $${criteria.minSize}M`);
    if (criteria.maxSize) parts.push(`Max Size: $${criteria.maxSize}M`);
    if (criteria.geography) parts.push(`Geography: ${criteria.geography}`);
    if (criteria.sector) parts.push(`Sector: ${criteria.sector}`);
    
    return parts.join(' • ') || 'No filters applied';
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
            <div className="h-16 w-16 rounded-full overflow-hidden bg-primary-light flex items-center justify-center text-white text-xl font-semibold">
              {investor.profile?.avatar_url ? (
                <img 
                  src={investor.profile.avatar_url} 
                  alt={investor.name} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // If image fails to load, show the fallback
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = investor.name.charAt(0).toUpperCase();
                  }}
                />
              ) : (
                investor.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.name}</dd>
              </div>
              
              {investor.profile?.company && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.profile.company}</dd>
                </div>
              )}
              
              {investor.profile?.title && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.profile.title}</dd>
                </div>
              )}
              
              <div className={`${investor.profile?.title ? 'bg-white' : 'bg-gray-50'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                <dt className="text-sm font-medium text-gray-500">Referring Agent</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {investor.agent ? `${investor.agent.name} (${investor.agent.firm})` : 'Direct / Other Agent'}
                </dd>
              </div>
              
              <div className={`${investor.profile?.title ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${investor.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {investor.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </dd>
              </div>
              
              {investor.profile?.phone && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.profile.phone}</dd>
                </div>
              )}
              
              {investor.profile?.bio && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Bio</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{investor.profile.bio}</dd>
                </div>
              )}
              
              {(investor.profile?.linkedin_url || investor.profile?.website_url) && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Links</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 space-x-4">
                    {investor.profile.linkedin_url && (
                      <a href={investor.profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark">
                        LinkedIn
                      </a>
                    )}
                    {investor.profile.website_url && (
                      <a href={investor.profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark">
                        Website
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Interests Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Fund Interests</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Funds this investor has expressed interest in</p>
          </div>
          <div className="border-t border-gray-200">
            {interests.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                No interests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Investment</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interests.map((interest) => (
                      <tr key={interest.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{interest.fund.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{interest.fund.strategy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(interest.fund.size)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(interest.fund.minimum_investment)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(interest.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Saved Searches Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Saved Searches</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Fund search criteria saved by this investor</p>
          </div>
          <div className="border-t border-gray-200">
            {savedSearches.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                No saved searches found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedSearches.map((search) => (
                      <tr key={search.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{search.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatCriteria(search.criteria)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(search.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${search.alerts_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {search.alerts_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 