import React from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import InvestorsClient from './InvestorsClient';

export default async function InvestorsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
          <p>Please log in to view this page.</p>
        </div>
      </div>
    );
  }
  
  // Fetch investors associated with this agent
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('*')
    .eq('introducing_agent_id', session.user.id);
    
  if (investorsError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>Failed to fetch investors: {investorsError.message}</p>
        </div>
      </div>
    );
  }
  
  return <InvestorsClient investors={investors || []} />;
} 