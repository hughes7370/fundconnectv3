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
  description: string | null;
  investment_strategy: string | null;
  target_return: number | null;
  fund_manager: string | null;
  fund_manager_bio: string | null;
  fund_website: string | null;
  fund_logo_url: string | null;
  uploaded_by_agent_id: string;
  agent: {
    user_id: string;
    name: string;
    firm: string;
    broker_dealer_verified: boolean;
    profile?: {
      avatar_url: string | null;
      bio: string | null;
      title: string | null;
      years_experience: number | null;
      certifications: string | null;
      linkedin_url: string | null;
      website_url: string | null;
      company: string | null;
    };
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
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  useEffect(() => {
    const loadFund = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Use a simpler query that doesn't include the potentially missing columns
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
            uploaded_by_agent_id
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
        
        // Try to get the enhanced fields separately to avoid errors
        let enhancedData = {};
        try {
          const { data: enhancedFields, error: enhancedError } = await supabase
            .from('funds')
            .select(`
              description,
              investment_strategy,
              target_return,
              fund_manager,
              fund_manager_bio,
              fund_website,
              fund_logo_url
            `)
            .eq('id', fundId)
            .single();
            
            if (!enhancedError && enhancedFields) {
              enhancedData = enhancedFields;
              console.log('Enhanced fields loaded successfully');
            }
        } catch (enhancedError) {
          console.log('Enhanced fields not available');
        }
        
        console.log('Fund data:', fundData);
        console.log('Uploaded by agent ID:', fundData.uploaded_by_agent_id);
        
        // Log all agents in the database to see what's available
        try {
          console.log('Querying all agents in the database');
          const { data: allAgents, error: allAgentsError } = await supabase
            .from('agents')
            .select('*');
            
          if (!allAgentsError && allAgents) {
            console.log('All agents in database:', allAgents);
          } else {
            console.error('Error loading all agents:', allAgentsError);
          }
        } catch (error) {
          console.error('Exception loading all agents:', error);
        }
        
        // Check if the user exists in the auth.users table
        try {
          console.log('Checking if user exists in auth.users');
          const { data: authUser, error: authUserError } = await supabase.auth.getUser(fundData.uploaded_by_agent_id);
          
          if (!authUserError && authUser) {
            console.log('Auth user found:', authUser);
          } else {
            console.error('Error or no auth user found:', authUserError);
          }
        } catch (error) {
          console.error('Exception checking auth user:', error);
        }
        
        // Try a direct SQL query to check the agents table
        try {
          console.log('Trying direct SQL query for agents');
          const { data: sqlAgents, error: sqlAgentsError } = await supabase.rpc('get_agent_by_id', {
            agent_id: fundData.uploaded_by_agent_id
          });
          
          if (!sqlAgentsError && sqlAgents) {
            console.log('SQL query result:', sqlAgents);
          } else {
            console.error('SQL query error or no results:', sqlAgentsError);
          }
        } catch (error) {
          console.error('Exception running SQL query:', error);
        }
        
        // Check all profiles in the database
        try {
          console.log('Querying all profiles in the database');
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('*');
            
          if (!allProfilesError && allProfiles) {
            console.log('All profiles in database:', allProfiles);
          } else {
            console.error('Error loading all profiles:', allProfilesError);
          }
        } catch (error) {
          console.error('Exception loading all profiles:', error);
        }
        
        // After all the debugging queries, before the agent query
        // Create or update the agent record if it doesn't exist
        try {
          console.log('Attempting to create or update agent record');
          
          // First check if the agent exists
          const { data: existingAgent, error: existingAgentError } = await supabase
            .from('agents')
            .select('*')
            .eq('user_id', fundData.uploaded_by_agent_id)
            .single();
            
          if (existingAgentError || !existingAgent) {
            console.log('Agent not found, creating a new record');
            
            // Create a new agent record
            const { data: newAgent, error: newAgentError } = await supabase
              .from('agents')
              .upsert({
                user_id: fundData.uploaded_by_agent_id,
                name: 'Fund Manager',
                firm: 'Fund Connect',
                broker_dealer_verified: false
              })
              .select()
              .single();
              
            if (!newAgentError && newAgent) {
              console.log('Created new agent record:', newAgent);
            } else {
              console.error('Error creating agent record:', newAgentError);
            }
          } else {
            console.log('Agent record exists:', existingAgent);
          }
        } catch (error) {
          console.error('Exception creating/updating agent record:', error);
        }
        
        // Directly query the agent information with correctly joined profile data
        let agentData = null;
        try {
          // First fetch the agent
          const { data: agentInfo, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('user_id', fundData.uploaded_by_agent_id)
            .single();
            
          if (!agentError && agentInfo) {
            agentData = agentInfo;
            console.log('Agent info loaded successfully:', agentInfo);
          } else {
            console.log('Agent not found or error loading agent info:', agentError);
            
            // Create a default agent record if it doesn't exist
            const { data: newAgent, error: createError } = await supabase
              .from('agents')
              .upsert({
                user_id: fundData.uploaded_by_agent_id,
                name: 'Fund Manager',
                firm: 'Fund Connect',
                broker_dealer_verified: false
              })
              .select()
              .single();
              
            if (!createError && newAgent) {
              console.log('Created new agent record:', newAgent);
              agentData = newAgent;
            } else {
              console.error('Failed to create agent record:', createError);
              // Set default agent data for display purposes
              agentData = {
                user_id: fundData.uploaded_by_agent_id,
                name: 'Fund Manager',
                firm: 'Fund Connect',
                broker_dealer_verified: false
              };
            }
          }
        } catch (error) {
          console.error('Exception loading or creating agent info:', error);
          // Set default agent data
          agentData = {
            user_id: fundData.uploaded_by_agent_id,
            name: 'Fund Manager',
            firm: 'Fund Connect',
            broker_dealer_verified: false
          };
        }
        
        // Now fetch the profile separately using the same user_id
        let profileData = null;
        try {
          console.log('Attempting to load profile with ID:', fundData.uploaded_by_agent_id);
          
          // First try with a direct query
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              avatar_url,
              bio,
              title,
              years_experience,
              certifications,
              linkedin_url,
              website_url,
              company
            `)
            .eq('id', fundData.uploaded_by_agent_id)
            .single();
            
          if (!profileError && profile) {
            profileData = profile;
            console.log('Profile loaded successfully:', profile);
          } else {
            console.log('Profile not found with standard query or error loading profile:', profileError);
            
            // Try with a direct SQL RPC call to bypass potential RLS issues
            console.log('Attempting to fetch profile with SQL function');
            const { data: rpcProfile, error: rpcError } = await supabase.rpc('get_profile_by_id', {
              profile_id: fundData.uploaded_by_agent_id
            });
            
            if (!rpcError && rpcProfile) {
              console.log('Profile loaded via RPC:', rpcProfile);
              profileData = rpcProfile;
            } else {
              console.log('RPC profile fetch failed:', rpcError);
              
              // Try with a public function (if available)
              console.log('Attempting public profile fetch');
              const { data: publicProfile, error: publicError } = await supabase.rpc('get_public_profile', {
                user_id: fundData.uploaded_by_agent_id
              });
              
              if (!publicError && publicProfile) {
                console.log('Profile loaded via public function:', publicProfile);
                profileData = publicProfile;
              } else {
                console.log('Public profile fetch failed:', publicError);
                
                // Last resort: try to query all profiles and find the matching one
                console.log('Attempting to fetch all profiles to find match');
                const { data: allProfiles, error: allProfilesError } = await supabase
                  .from('profiles')
                  .select('*');
                  
                if (!allProfilesError && allProfiles) {
                  console.log('All profiles count:', allProfiles.length);
                  const matchingProfile = allProfiles.find(p => p.id === fundData.uploaded_by_agent_id);
                  
                  if (matchingProfile) {
                    console.log('Found matching profile in all profiles:', matchingProfile);
                    profileData = matchingProfile;
                  } else {
                    console.log('No matching profile found in all profiles');
                    // Try to check for case sensitivity issues
                    const potentialMatches = allProfiles.filter(p => 
                      p.id.toLowerCase() === fundData.uploaded_by_agent_id.toLowerCase()
                    );
                    console.log('Potential case-insensitive matches:', potentialMatches);
                  }
                }
              }
            }
            
            // If all query attempts fail, try to create a new profile as a last resort
            if (!profileData) {
              console.log('All profile fetch attempts failed, trying to create a new profile');
              try {
                // Try to create a basic profile
                const { data: newProfile, error: createProfileError } = await supabase
                  .from('profiles')
                  .upsert({
                    id: fundData.uploaded_by_agent_id,
                    name: agentData.name,
                    title: 'Investment Manager',
                    bio: null,
                    years_experience: null,
                    certifications: null
                  })
                  .select()
                  .single();
                  
                if (!createProfileError && newProfile) {
                  console.log('Created new profile record:', newProfile);
                  profileData = newProfile;
                } else {
                  console.log('Failed to create profile record:', createProfileError);
                }
              } catch (createError) {
                console.error('Exception while creating profile:', createError);
              }
            }
          }
        } catch (error) {
          console.error('Exception loading profile:', error);
        }
        
        // Log the agent and profile data for debugging
        console.log('Agent data:', agentData);
        console.log('Profile data:', profileData);
        console.log('Uploaded by agent ID:', fundData.uploaded_by_agent_id);
        
        // Additional diagnostic information
        const debugInfo = {
          fundId: fundData.id,
          uploadedByAgentId: fundData.uploaded_by_agent_id,
          agent: {
            user_id: agentData?.user_id,
            name: agentData?.name,
            firm: agentData?.firm,
            verified: agentData?.broker_dealer_verified
          },
          profile: {
            exists: !!profileData,
            data: profileData ? {
              avatar_url: profileData.avatar_url,
              title: profileData.title,
              bio: profileData.bio,
              years_experience: profileData.years_experience
            } : null
          },
          relationships: {
            fund_to_agent: "funds.uploaded_by_agent_id → agents.user_id",
            agent_to_profile: "agents.user_id → profiles.id"
          }
        };
        
        console.log('Full debug info:', JSON.stringify(debugInfo, null, 2));
        
        // Use type assertion to satisfy TypeScript
        const formattedFund: Fund = {
          ...fundData,
          ...enhancedData, // Add the enhanced fields if they exist
          // Ensure all required fields have default values
          uploaded_by_agent_id: fundData.uploaded_by_agent_id,
          description: (enhancedData as any)?.description || null,
          investment_strategy: (enhancedData as any)?.investment_strategy || null,
          target_return: (enhancedData as any)?.target_return || null,
          fund_manager: (enhancedData as any)?.fund_manager || null,
          fund_manager_bio: (enhancedData as any)?.fund_manager_bio || null,
          fund_website: (enhancedData as any)?.fund_website || null,
          fund_logo_url: (enhancedData as any)?.fund_logo_url || null,
          agent: {
            user_id: agentData?.user_id,
            name: agentData?.name,
            firm: agentData?.firm,
            broker_dealer_verified: agentData?.broker_dealer_verified,
            // Use the fetched profile data with proper typing
            profile: profileData ? {
              avatar_url: profileData.avatar_url,
              bio: profileData.bio,
              title: profileData.title,
              years_experience: profileData.years_experience,
              certifications: profileData.certifications,
              linkedin_url: profileData.linkedin_url,
              website_url: profileData.website_url,
              company: profileData.company
            } : undefined
          },
          documents: documents || []
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
            <div className="flex items-center">
              {fund.fund_logo_url && (
                <img 
                  src={fund.fund_logo_url} 
                  alt={`${fund.name} logo`} 
                  className="h-16 w-16 object-contain mr-4 rounded-md"
                />
              )}
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {fund.name}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {fund.strategy} • {fund.sector_focus} • {fund.geography}
                </p>
              </div>
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
          
          {fund.description && (
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                About This Fund
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {fund.description}
              </p>
            </div>
          )}
          
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
              {fund.investment_strategy && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Investment Strategy
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.investment_strategy}
                  </dd>
                </div>
              )}
              {fund.target_return !== null && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Target Return
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.target_return}%
                  </dd>
                </div>
              )}
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
              {fund.fund_manager && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Fund Manager
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {fund.fund_manager}
                    {fund.fund_manager_bio && (
                      <p className="mt-1 text-sm text-gray-600">
                        {fund.fund_manager_bio}
                      </p>
                    )}
                  </dd>
                </div>
              )}
              {fund.fund_website && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Fund Website
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <a 
                      href={fund.fund_website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark"
                    >
                      {fund.fund_website}
                    </a>
                  </dd>
                </div>
              )}
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

        {/* Agent Profile Section as Collapsible Accordion */}
        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 mt-8 shadow overflow-hidden sm:rounded-lg">
          <dt className="text-sm font-medium text-gray-500">
            Listed By
          </dt>
          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
            <button 
              onClick={() => setShowAgentDetails(!showAgentDetails)}
              className="w-full flex justify-between items-center focus:outline-none"
            >
              <span className="text-sm text-gray-500">
                Contact information and details about the agent who listed this fund.
              </span>
              <div className="text-gray-400">
                {showAgentDetails ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
            
            {showAgentDetails && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {fund.agent?.profile?.avatar_url ? (
                      <img
                        className="h-16 w-16 rounded-full object-cover"
                        src={fund.agent.profile.avatar_url}
                        alt={`${fund.agent.name} avatar`}
                        onError={(e) => {
                          console.error('Avatar image failed to load:', fund.agent?.profile?.avatar_url);
                          e.currentTarget.src = 'https://via.placeholder.com/150';
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xl font-medium text-white">
                          {fund.agent?.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-6 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 flex items-center">
                          {fund.agent?.name}
                          {fund.agent?.broker_dealer_verified && (
                            <svg 
                              className="ml-1.5 h-5 w-5 text-blue-500" 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {fund.agent?.profile?.title || 'Listing Representative'} at {fund.agent?.firm}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {fund.agent?.profile?.company && (
                            <span className="mr-2">Company: {fund.agent.profile.company}</span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex space-x-3">
                        {fund.agent?.profile?.linkedin_url && (
                          <a 
                            href={fund.agent.profile.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">LinkedIn</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                          </a>
                        )}
                        
                        {fund.agent?.profile?.website_url && (
                          <a 
                            href={fund.agent.profile.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Website</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm6.918 6h-3.215c-.188-1.424-.42-2.65-.658-3.477 1.634.89 2.905 2.068 3.873 3.477zM12 4.25c.323 0 .917 1.108 1.374 3.75h-2.748C11.083 5.358 11.677 4.25 12 4.25zm-6.918 3.75c.968-1.41 2.239-2.587 3.873-3.477-.238.827-.47 2.053-.658 3.477H5.082zM4.25 12c0-.69.062-1.363.18-2h3.726c-.045.664-.074 1.327-.074 2s.03 1.336.074 2H4.43c-.118-.637-.18-1.31-.18-2s.062-1.363.18-2zm.832 4h3.215c.188 1.424.42 2.65.658 3.477-1.634-.89-2.905-2.068-3.873-3.477zM12 19.75c-.323 0-.917-1.108-1.374-3.75h2.748c-.457 2.642-1.051 3.75-1.374 3.75zm0-5.75c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1zm6.918 5.75c-.968 1.41-2.239 2.587-3.873 3.477.238-.827.47-2.053.658-3.477h3.215zM16.07 14c.045-.664.074-1.327.074-2s-.03-1.336-.074-2h3.726c.118.637.18 1.31.18 2s-.062 1.363-.18 2h-3.726z"/>
                            </svg>
                          </a>
                        )}
                        
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          Contact Agent
                        </button>
                      </div>
                    </div>
                    
                    {/* Display additional profile information if available */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <h5 className="text-sm font-medium text-gray-700">Profile Information</h5>
                      
                      {/* If we have the profile data, show it */}
                      {fund.agent?.profile && (
                        <>
                          {/* Always display bio if available */}
                          {fund.agent.profile.bio && (
                            <div className="mt-2">
                              <h6 className="text-xs font-medium text-gray-600">Bio</h6>
                              <p className="text-sm text-gray-600">{fund.agent.profile.bio}</p>
                            </div>
                          )}
                          
                          {/* Show experience and certifications */}
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            {(typeof fund.agent.profile.years_experience === 'number') && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-600">Experience</h6>
                                <p className="text-sm text-gray-600">{fund.agent.profile.years_experience} years</p>
                              </div>
                            )}
                            
                            {fund.agent.profile.certifications && fund.agent.profile.certifications !== "Null" && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-600">Certifications</h6>
                                <p className="text-sm text-gray-600">{fund.agent.profile.certifications}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {/* If we don't have profile data, display a message */}
                      {!fund.agent?.profile && (
                        <p className="text-sm text-gray-500 italic">No additional profile information available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </dd>
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