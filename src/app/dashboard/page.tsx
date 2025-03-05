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
          
          // For MVP we'll just count the funds
          setStats({
            totalFunds: funds?.length || 0,
            activeInterests: 0, // We'll implement this later
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
        <div className="md:grid md:grid-cols-3 md:gap-6">
          {/* Summary Cards */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                {userRole === 'agent' ? 'Your Funds' : 'Available Funds'}
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {stats.totalFunds}
              </dd>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg mt-4 md:mt-0">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                {userRole === 'investor' ? 'Active Interests' : userRole === 'admin' ? 'Pending Approvals' : 'Investor Interests'}
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {userRole === 'investor' ? stats.activeInterests : userRole === 'admin' ? stats.pendingApprovals : stats.activeInterests}
              </dd>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg mt-4 md:mt-0">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                {userRole === 'agent' ? 'Commission Rate' : userRole === 'investor' ? 'Saved Searches' : 'Total Users'}
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {userRole === 'agent' ? '5%' : userRole === 'investor' ? '0' : '0'}
              </dd>
            </div>
          </div>
        </div>

        {/* Role-specific dashboard content */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">{getRoleSpecificHeading()}</h2>
          
          <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
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
        return (
          <p className="text-gray-500">
            No recent investor activity to display. As investors express interest in your funds, they will appear here.
          </p>
        );
      case 'investor':
        return (
          <p className="text-gray-500">
            No recent fund matches to display. As new funds matching your criteria are added, they will appear here.
          </p>
        );
      case 'admin':
        return (
          <div>
            <p className="text-gray-500 mb-4">
              System Status: <span className="text-green-500 font-medium">Online</span>
            </p>
            
            {stats.pendingApprovals > 0 ? (
              <div className="bg-yellow-50 p-4 rounded-md">
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
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                No pending approvals. All systems running smoothly.
              </p>
            )}
          </div>
        );
      default:
        return (
          <p className="text-gray-500">
            Dashboard content is loading...
          </p>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          {userName && (
            <div className="text-sm text-gray-500">
              Welcome, <span className="font-medium text-gray-900">{userName}</span>
              {userRole && <span className="ml-1">({userRole})</span>}
            </div>
          )}
        </div>
        
        {error && !showFallback && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        <div className="py-4">
          {renderDashboardContent()}
        </div>
      </div>
    </DashboardLayout>
  );
} 