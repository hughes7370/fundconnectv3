import React from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  // Verify that the user is an agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
  
  if (error || !agent) {
    redirect('/'); // Redirect to home if not an agent
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-800">Fund Connect</h1>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a href="/agent/dashboard" className="text-gray-600 hover:text-blue-600 transition">Dashboard</a>
                </li>
                <li>
                  <a href="/agent/funds" className="text-gray-600 hover:text-blue-600 transition">Funds</a>
                </li>
                <li>
                  <a href="/agent/investors" className="text-gray-600 hover:text-blue-600 transition">Investors</a>
                </li>
                <li>
                  <a href="/agent/commissions" className="text-gray-600 hover:text-blue-600 transition">Commissions</a>
                </li>
                <li>
                  <a href="/auth/logout" className="text-gray-600 hover:text-red-600 transition">Logout</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-500 text-sm">© {new Date().getFullYear()} Fund Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 