'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function SimpleDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('Simple Dashboard: Checking session...');
        const { data, error } = await supabase.auth.getSession();
        
        console.log('Simple Dashboard: Session data:', data);
        
        if (error) {
          setError(error.message);
        } else {
          setUser(data.session?.user || null);
        }
      } catch (err: any) {
        console.error('Simple Dashboard: Error getting session:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-700 mb-4">You need to log in to access this page.</p>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Simple Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="mb-2"><strong>User ID:</strong> {user.id}</p>
                <p className="mb-2"><strong>Email:</strong> {user.email}</p>
                <p className="mb-2"><strong>Role:</strong> {user.user_metadata?.role || 'No role set'}</p>
                <p className="mb-2"><strong>Name:</strong> {user.user_metadata?.name || 'No name set'}</p>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="text-md font-medium text-blue-800 mb-2">Navigation Options</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/dashboard" className="text-blue-600 hover:underline">
                        Main Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard/test" className="text-blue-600 hover:underline">
                        Test Page
                      </Link>
                    </li>
                    {user.user_metadata?.role === 'agent' && (
                      <li>
                        <Link href="/agent/funds" className="text-blue-600 hover:underline">
                          My Funds
                        </Link>
                      </li>
                    )}
                    {user.user_metadata?.role === 'investor' && (
                      <li>
                        <Link href="/investor/funds" className="text-blue-600 hover:underline">
                          Find Funds
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="text-md font-medium text-green-800 mb-2">Status</h3>
                  <p className="text-green-700">
                    ✅ You are successfully authenticated!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 