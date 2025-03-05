'use client';

import { useState, useEffect } from 'react';
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

export default function Register() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'investor';
  
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
    const roleParam = searchParams.get('role') as UserRole;
    if (roleParam && (roleParam === 'agent' || roleParam === 'investor')) {
      setRole(roleParam);
    }
  }, [searchParams]);

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
            const { data: agentData, error: inviteError } = await supabase
              .from('invitation_codes')
              .select('agent_id')
              .eq('code', invitationCode)
              .single();
            
            if (inviteError && inviteError.code !== 'PGRST116') {
              throw inviteError;
            }
            
            if (agentData) {
              agentId = agentData.agent_id;
            }
          }
          
          try {
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
        
        <div className="flex justify-center space-x-4">
          <button
            type="button"
            onClick={() => setRole('agent')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              role === 'agent'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Fund Placement Agent
          </button>
          <button
            type="button"
            onClick={() => setRole('investor')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              role === 'investor'
                ? 'bg-secondary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Investor (LP)
          </button>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
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
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {role === 'investor' && !invitationCode && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Without an invitation code, your registration will require admin approval before you can access the platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
        
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