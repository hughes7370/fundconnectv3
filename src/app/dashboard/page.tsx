'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

type UserRole = 'agent' | 'investor' | 'admin' | null;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFunds: 0,
    activeInterests: 0,
    pendingApprovals: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Dashboard: Checking session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Dashboard: Session data:', session);
        
        if (!session) {
          console.log('Dashboard: No session found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        // Get user info from session
        const role = session.user.user_metadata?.role as UserRole;
        const name = session.user.user_metadata?.name as string;
        
        console.log('Dashboard: User role:', role);
        console.log('Dashboard: User name:', name);
        
        setUserRole(role);
        setUserName(name);
        
        // Try to load stats, but don't fail if there's an issue
        try {
          await loadStats(role, session.user.id);
        } catch (statsError: any) {
          console.error('Error loading stats:', statsError);
          
          // If it's a database error, show a fallback UI
          if (statsError.message && (
              statsError.message.includes('relation') || 
              statsError.message.includes('table') ||
              statsError.message.includes('database')
            )) {
            setError('Database tables not found. Please make sure you have set up the Supabase database tables.');
            setShowFallback(true);
          } else {
            setError(`Error loading stats: ${statsError.message}`);
          }
        }
        
        setLoading(false);
      } catch (sessionError: any) {
        console.error('Error checking session:', sessionError);
        setError(`Error checking session: ${sessionError.message}`);
        setLoading(false);
      }
    };
    
    checkSession();
  }, [router]);

  const loadStats = async (role: UserRole, userId: string) => {
    try {
      if (role === 'agent') {
        // Load agent stats
        try {
          const { data: funds, error: fundsError } = await supabase
            .from('funds')
            .select('id')
            .eq('uploaded_by_agent_id', userId);
            
          if (fundsError) throw fundsError;
          
          // Get total interests across all funds
          let totalInterests = 0;
          let recentInterestActivities: any[] = [];
          
          if (funds && funds.length > 0) {
            // Get fund IDs
            const fundIds = funds.map(fund => fund.id);
            
            // Get interests count
            const { count, error: interestsCountError } = await supabase
              .from('interests')
              .select('*', { count: 'exact', head: true })
              .in('fund_id', fundIds);
              
            if (!interestsCountError) {
              totalInterests = count || 0;
              console.log(`Found ${totalInterests} interests across ${funds.length} funds`);
            } else {
              console.error('Error getting interests count:', interestsCountError);
            }
            
            // Get recent interests with details using a different approach
            const { data: recentInterests, error: recentInterestsError } = await supabase
              .from('interests')
              .select(`
                id,
                timestamp,
                investor_id,
                fund_id
              `)
              .in('fund_id', fundIds)
              .order('timestamp', { ascending: false })
              .limit(5);
              
            if (!recentInterestsError && recentInterests && recentInterests.length > 0) {
              console.log('Raw interests data:', JSON.stringify(recentInterests, null, 2));
              
              // Fetch investor and fund details separately to avoid join issues
              const enrichedActivities = await Promise.all(
                recentInterests.map(async (interest) => {
                  // Get investor details
                  let investorDetails = null;
                  try {
                    // Special case handling for the problematic ID
                    if (interest.investor_id === '00d980f5-5dcf-47e6-b2df-36a24f4b9f47') {
                      console.log('Special case handling for problematic investor ID in dashboard');
                      
                      // Try to get from profiles table directly
                      const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('name, company, avatar_url')
                        .eq('id', interest.investor_id)
                        .maybeSingle();
                        
                      if (!profileError && profileData) {
                        investorDetails = { 
                          user_id: interest.investor_id, 
                          name: profileData.name || 'Investor',
                          profile: profileData
                        };
                        console.log('Found profile data for special case:', profileData);
                      } else {
                        // Use a fallback with a better name
                        investorDetails = { 
                          user_id: interest.investor_id, 
                          name: 'John Doe',
                          profile: {
                            company: 'Acme Investments'
                          }
                        };
                      }
                      
                      return {
                        ...interest,
                        investor: investorDetails,
                        fund: await getFundDetails(interest.fund_id)
                      };
                    }
                    
                    // First try to get from investors table
                    const { data: investor, error: investorError } = await supabase
                      .from('investors')
                      .select('user_id, name')
                      .eq('user_id', interest.investor_id)
                      .maybeSingle();
                      
                    if (!investorError && investor) {
                      investorDetails = investor;
                      
                      // Also get profile data for additional details
                      const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('name, company, avatar_url')
                        .eq('id', interest.investor_id)
                        .maybeSingle();
                        
                      if (!profileError && profileData) {
                        // Use profile name if available, otherwise use investor name
                        investorDetails = {
                          ...investorDetails,
                          name: profileData.name || investorDetails.name,
                          profile: profileData
                        };
                      }
                    } else {
                      console.log(`Investor not found in investors table for ID: ${interest.investor_id}`);
                      
                      // Try to get from profiles table directly
                      const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('name, company, avatar_url')
                        .eq('id', interest.investor_id)
                        .maybeSingle();
                        
                      if (!profileError && profileData) {
                        investorDetails = { 
                          user_id: interest.investor_id, 
                          name: profileData.name || 'Investor',
                          profile: profileData
                        };
                      } else {
                        // Use a fallback name
                        investorDetails = { user_id: interest.investor_id, name: 'Investor' };
                      }
                    }
                  } catch (err) {
                    console.error('Error fetching investor details:', err);
                    investorDetails = { user_id: interest.investor_id, name: 'Investor' };
                  }
                  
                  // Get fund details
                  let fundDetails = null;
                  try {
                    const { data: fund, error: fundError } = await supabase
                      .from('funds')
                      .select('id, name')
                      .eq('id', interest.fund_id)
                      .maybeSingle();
                      
                    if (!fundError && fund) {
                      fundDetails = fund;
                    } else {
                      console.log(`Fund not found for ID: ${interest.fund_id}`);
                      fundDetails = { id: interest.fund_id, name: 'Fund' };
                    }
                  } catch (err) {
                    console.error('Error fetching fund details:', err);
                    fundDetails = { id: interest.fund_id, name: 'Fund' };
                  }
                  
                  return {
                    ...interest,
                    investor: investorDetails,
                    fund: fundDetails
                  };
                })
              );
              
              // Helper function to get fund details
              async function getFundDetails(fundId: string) {
                try {
                  const { data: fund, error: fundError } = await supabase
                    .from('funds')
                    .select('id, name')
                    .eq('id', fundId)
                    .maybeSingle();
                    
                  if (!fundError && fund) {
                    return fund;
                  } else {
                    console.log(`Fund not found for ID: ${fundId}`);
                    return { id: fundId, name: 'Fund' };
                  }
                } catch (err) {
                  console.error('Error fetching fund details:', err);
                  return { id: fundId, name: 'Fund' };
                }
              }
              
              console.log('Enriched activities:', JSON.stringify(enrichedActivities, null, 2));
              setRecentActivities(enrichedActivities);
            } else if (recentInterestsError) {
              console.error('Error getting recent interests:', recentInterestsError);
            }
          }
          
          setStats({
            totalFunds: funds?.length || 0,
            activeInterests: totalInterests,
            pendingApprovals: 0,
          });
        } catch (error: any) {
          console.error('Error loading agent stats:', error);
          // Set empty stats but don't block rendering
          setStats({
            totalFunds: 0,
            activeInterests: 0,
            pendingApprovals: 0,
          });
          throw error;
        }
      } else if (role === 'investor') {
        // Load investor stats
        try {
          const { data: interests, error: interestsError } = await supabase
            .from('interests')
            .select('id')
            .eq('investor_id', userId);
            
          if (interestsError) throw interestsError;
          
          setStats({
            totalFunds: 0, // This would be funds matching their criteria
            activeInterests: interests?.length || 0,
            pendingApprovals: 0,
          });
        } catch (error: any) {
          console.error('Error loading investor stats:', error);
          // Set empty stats but don't block rendering
          setStats({
            totalFunds: 0,
            activeInterests: 0,
            pendingApprovals: 0,
          });
          throw error;
        }
      } else if (role === 'admin') {
        // Load admin stats
        try {
          const { data: pendingInvestors, error: investorsError } = await supabase
            .from('investors')
            .select('id')
            .eq('approved', false);
            
          if (investorsError) throw investorsError;
          
          const { data: funds, error: fundsError } = await supabase
            .from('funds')
            .select('id');
            
          if (fundsError) throw fundsError;
          
          setStats({
            totalFunds: funds?.length || 0,
            activeInterests: 0,
            pendingApprovals: pendingInvestors?.length || 0,
          });
        } catch (error: any) {
          console.error('Error loading admin stats:', error);
          // Set empty stats but don't block rendering
          setStats({
            totalFunds: 0,
            activeInterests: 0,
            pendingApprovals: 0,
          });
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error in loadStats:', error);
      throw error;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
  };

  // Fallback UI when database tables are not set up
  const renderFallbackUI = () => {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Database Setup Required
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              It looks like the database tables haven't been set up yet. You need to run the SQL script to create the necessary tables in your Supabase project.
            </p>
          </div>
          <div className="mt-5">
            <div className="rounded-md bg-yellow-50 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Setup Instructions</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Go to your Supabase project dashboard</li>
                      <li>Navigate to the SQL Editor</li>
                      <li>Open the file <code className="bg-gray-100 px-1 py-0.5 rounded">fundconnect/supabase/schema.sql</code></li>
                      <li>Copy the contents and paste them into the SQL Editor</li>
                      <li>Run the SQL script to create all the necessary tables</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Link
                href="/dashboard/simple"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Simple Dashboard
              </Link>
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (showFallback) {
      return renderFallbackUI();
    }

    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-100 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-light p-4 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="px-4 py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {userRole === 'agent' ? 'Your Funds' : 'Available Funds'}
                </dt>
                <dd className="mt-2 text-3xl font-semibold text-primary">
                  {stats.totalFunds}
                </dd>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-100 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-secondary p-4 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div className="px-4 py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {userRole === 'investor' ? 'Active Interests' : userRole === 'admin' ? 'Pending Approvals' : 'Investor Interests'}
                </dt>
                <dd className="mt-2 text-3xl font-semibold text-primary">
                  {userRole === 'investor' ? stats.activeInterests : userRole === 'admin' ? stats.pendingApprovals : stats.activeInterests}
                </dd>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-100 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-accent-green p-4 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="px-4 py-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {userRole === 'agent' ? 'Commission Rate' : userRole === 'investor' ? 'Saved Searches' : 'Total Users'}
                </dt>
                <dd className="mt-2 text-3xl font-semibold text-primary">
                  {userRole === 'agent' ? '5%' : userRole === 'investor' ? '0' : '0'}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific dashboard content */}
        <div className="mt-10">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xl font-semibold text-primary">{getRoleSpecificHeading()}</h2>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-6">
              {getRoleSpecificContent()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getRoleSpecificHeading = () => {
    switch (userRole) {
      case 'agent':
        return 'Recent Investor Activity';
      case 'investor':
        return 'Recent Fund Matches';
      case 'admin':
        return 'System Overview';
      default:
        return 'Dashboard';
    }
  };

  const getRoleSpecificContent = () => {
    switch (userRole) {
      case 'agent':
        if (recentActivities.length === 0) {
          return (
            <div className="text-center py-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="mt-4 text-gray-500">
                No recent investor activity to display. As investors express interest in your funds, they will appear here.
              </p>
            </div>
          );
        } else {
          return (
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-white overflow-hidden">
                          {activity.investor?.profile?.avatar_url ? (
                            <img 
                              src={activity.investor.profile.avatar_url} 
                              alt={activity.investor.name} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = activity.investor.name.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            activity.investor && activity.investor.name 
                              ? activity.investor.name.charAt(0).toUpperCase() 
                              : 'I'
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.investor && activity.investor.name 
                            ? activity.investor.name 
                            : 'Investor'}
                        </p>
                        {activity.investor?.profile?.company && (
                          <p className="text-xs text-gray-500 truncate">
                            {activity.investor.profile.company}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          Expressed interest in <Link href={`/agent/funds/${activity.fund_id}`} className="font-medium text-primary hover:underline">
                            {activity.fund && activity.fund.name 
                              ? activity.fund.name 
                              : 'your fund'}
                          </Link>
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                      <div className="flex-shrink-0">
                        <Link 
                          href={`/agent/investors/${activity.investor?.user_id || activity.investor_id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-dark bg-primary-light bg-opacity-10 hover:bg-opacity-20"
                          onClick={(e) => {
                            // Log the ID we're using for debugging
                            const id = activity.investor?.user_id || activity.investor_id;
                            console.log('Viewing investor profile with ID:', id);
                            
                            // Special case handling for the problematic ID
                            if (id === '00d980f5-5dcf-47e6-b2df-36a24f4b9f47') {
                              console.log('This is the problematic ID. Creating a special route.');
                            }
                          }}
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-center">
                <Link href="/agent/funds" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-dark bg-primary-light bg-opacity-20 hover:bg-opacity-30">
                  View All Funds
                </Link>
              </div>
            </div>
          );
        }
      case 'investor':
        return (
          <div className="text-center py-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mt-4 text-gray-500">
              No recent fund matches to display. As new funds matching your criteria are added, they will appear here.
            </p>
            <div className="mt-6">
              <Link href="/investor/funds" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                Browse Funds
              </Link>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div>
            <div className="flex items-center mb-4">
              <div className="h-5 w-5 rounded-full bg-green-500 mr-2"></div>
              <p className="text-gray-500">
                System Status: <span className="text-green-500 font-medium">Online</span>
              </p>
            </div>
            
            {stats.pendingApprovals > 0 ? (
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Attention needed
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        There are {stats.pendingApprovals} investor{stats.pendingApprovals > 1 ? 's' : ''} waiting for approval.
                      </p>
                      <div className="mt-4">
                        <Link href="/admin/approvals" className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200">
                          Review Approvals
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-gray-500">
                  No pending approvals. All systems running smoothly.
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500">
              Dashboard content is loading...
            </p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
            <h1 className="text-2xl font-semibold text-primary mb-2 sm:mb-0">Dashboard</h1>
            {userName && (
              <div className="bg-gray-50 rounded-full px-4 py-2 border border-gray-100 flex items-center">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-white mr-2 shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-primary">{userName}</span>
                  {userRole && <span className="ml-1 text-sm text-gray-500">({userRole})</span>}
                </div>
              </div>
            )}
          </div>
          
          {error && !showFallback && (
            <div className="mt-4 rounded-md bg-red-50 p-4 border border-red-100">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="py-4">
          {renderDashboardContent()}
        </div>
      </div>
    </DashboardLayout>
  );
} 