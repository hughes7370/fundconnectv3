'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function TestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setError(error.message);
        } else {
          setUser(data.session?.user || null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Test Page</h1>
      
      {user ? (
        <div>
          <p className="mb-2">✅ Authentication working!</p>
          <p className="mb-2">User ID: {user.id}</p>
          <p className="mb-2">Email: {user.email}</p>
          <p className="mb-2">Role: {user.user_metadata?.role || 'No role set'}</p>
          
          <div className="mt-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Go to main dashboard
            </Link>
          </div>
          
          <div className="mt-4">
            <button 
              className="bg-red-600 text-white px-4 py-2 rounded"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/auth/login';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-red-600 mb-4">❌ Not authenticated</p>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Go to login page
          </Link>
        </div>
      )}
    </div>
  );
} 