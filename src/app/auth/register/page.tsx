'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// Add this at the top after imports
// We'll create a helper function to directly get user ID from session
const getUserIdFromSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

type UserRole = 'agent' | 'investor';

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams?.get('role') as UserRole || 'investor';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [firm, setFirm] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Update role when URL param changes
  useEffect(() => {
    const roleParam = searchParams?.get('role') as UserRole;
    if (roleParam && (roleParam === 'agent' || roleParam === 'investor')) {
      setRole(roleParam);
    }
  }, [searchParams]);
  
  // Debug log for form rendering
  useEffect(() => {
    console.log('Rendering registration form with submit button');
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the user ID from the session
        const userId = authData.user.id;
        
        // 2. Create a record in the appropriate role table
        if (role === 'agent') {
          try {
            // Workaround for RLS policy - try with specific user ID
            const { error: profileError } = await supabase
              .from('agents')
              .insert([
                {
                  user_id: userId,
                  name,
                  firm,
                  broker_dealer_verified: false, // Requires verification
                },
              ]);

            if (profileError) {
              console.error("Agent profile creation error:", profileError);
              throw profileError;
            }
          } catch (profileError: any) {
            // If we get an RLS error, display a more helpful message
            if (profileError.message && profileError.message.includes('row-level security')) {
              throw new Error('Registration successful, but there was an issue creating your agent profile. Please contact support with this error: RLS policy violation.');
            }
            throw profileError;
          }
        } else if (role === 'investor') {
          let agentId = null;
          
          // If invitation code is provided, find the agent
          if (invitationCode) {
            console.log('Invitation code provided:', invitationCode);
            
            // First try to get the invitation code without any RLS restrictions
            const { data: invitationData, error: invitationError } = await supabase
              .from('invitation_codes')
              .select('agent_id, code')
              .eq('code', invitationCode.trim().toUpperCase())
              .single();
            
            console.log('Invitation lookup result:', { invitationData, invitationError });
            
            if (invitationError) {
              if (invitationError.code === 'PGRST116') {
                console.warn('No invitation found with code:', invitationCode);
              } else {
                console.error('Error looking up invitation code:', invitationError);
                throw new Error(`Invalid invitation code: ${invitationError.message}`);
              }
            } else if (invitationData) {
              agentId = invitationData.agent_id;
              console.log('Found agent ID from invitation:', agentId);
            }
          }
          
          try {
            console.log('Creating investor profile with agent ID:', agentId);
            const { error: profileError } = await supabase
              .from('investors')
              .insert([
                {
                  user_id: userId,
                  name,
                  introducing_agent_id: agentId,
                  approved: agentId !== null, // Auto-approve if invited by an agent
                },
              ]);

            if (profileError) {
              console.error("Investor profile creation error:", profileError);
              throw profileError;
            }
          } catch (profileError: any) {
            // If we get an RLS error, display a more helpful message
            if (profileError.message && profileError.message.includes('row-level security')) {
              throw new Error('Registration successful, but there was an issue creating your investor profile. Please contact support with this error: RLS policy violation.');
            }
            throw profileError;
          }
        }

        // Registration successful
        router.push('/auth/verify');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary-dark">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-center text-lg font-medium text-gray-900 mb-3">
            Select your account type:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div 
              onClick={() => setRole('agent')}
              className={`cursor-pointer p-6 rounded-lg border-2 ${
                role === 'agent'
                  ? 'border-primary bg-primary bg-opacity-10 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                  role === 'agent' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Fund Placement Agent</h4>
                <p className="text-sm text-gray-600 mb-3">For broker-dealers and placement agents representing funds</p>
                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${
                  role === 'agent' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {role === 'agent' ? 'Selected' : 'Select this option'}
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => setRole('investor')}
              className={`cursor-pointer p-6 rounded-lg border-2 ${
                role === 'investor'
                  ? 'border-secondary bg-secondary bg-opacity-10 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                  role === 'investor' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Investor (LP)</h4>
                <p className="text-sm text-gray-600 mb-3">For limited partners and investors looking to discover funds</p>
                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${
                  role === 'investor' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {role === 'investor' ? 'Selected' : 'Select this option'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <form onSubmit={handleRegister}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md shadow-sm -space-y-px mb-6">
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {role === 'agent' && (
                <div>
                  <label htmlFor="firm" className="sr-only">
                    Firm/Organization
                  </label>
                  <input
                    id="firm"
                    name="firm"
                    type="text"
                    autoComplete="organization"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                    placeholder="Firm/Organization"
                    value={firm}
                    onChange={(e) => setFirm(e.target.value)}
                  />
                </div>
              )}
              
              {role === 'investor' && (
                <div>
                  <label htmlFor="invitation-code" className="sr-only">
                    Invitation Code (if you have one)
                  </label>
                  <input
                    id="invitation-code"
                    name="invitation-code"
                    type="text"
                    autoComplete="off"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                    placeholder="Invitation Code (if you have one)"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {role === 'investor' && !invitationCode && (
              <div className="rounded-md bg-yellow-50 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Without an invitation code, your registration will require admin approval before you can access the platform.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent text-base font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-6">
          <p className="mt-2 text-center text-xs text-gray-600">
            By signing up, you agree to our{' '}
            <a href="#" className="font-medium text-primary hover:text-primary-dark">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-medium text-primary hover:text-primary-dark">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading registration form...</div>}>
      <RegisterForm />
    </Suspense>
  );
} 