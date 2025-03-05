'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';
import InvestorsClient from './InvestorsClient';

interface Investor {
  user_id: string;
  name: string;
  approved: boolean;
}

export default function InvestorsPage() {
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const loadInvestors = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Fetch investors associated with this agent
        const { data, error } = await supabase
          .from('investors')
          .select('*')
          .eq('introducing_agent_id', session.user.id);
          
        if (error) throw error;
        
        setInvestors(data || []);
      } catch (error) {
        console.error('Error loading investors:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadInvestors();
  }, [router]);
  
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p>Failed to fetch investors: {error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      {loading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="p-4">
            <div className="h-12 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <InvestorsClient investors={investors} />
      )}
    </DashboardLayout>
  );
} 