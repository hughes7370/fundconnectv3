import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Link from 'next/link';

export default function UserCheck() {
  const [loading, setLoading] = useState(true);
  const [authMethods, setAuthMethods] = useState([]);
  const [directQueryUser, setDirectQueryUser] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState('');
  const [identityMismatch, setIdentityMismatch] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Check for forced user ID in localStorage
        let forcedUserId = null;
        try {
          const authToken = localStorage.getItem('supabase.auth.token');
          if (authToken) {
            const parsedToken = JSON.parse(authToken);
            if (parsedToken?.currentSession?.user?.id) {
              forcedUserId = parsedToken.currentSession.user.id;
              console.log("Found forced user ID:", forcedUserId);
            }
          }
        } catch (e) {
          console.error("Error checking for forced user ID:", e);
        }
        
        // Method 1: auth.getSession()
        let sessionMethod = {
          name: 'auth.getSession()',
          success: false,
          error: 'No session found',
          userId: null
        };
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session) {
            sessionMethod = {
              name: 'auth.getSession()',
              success: true,
              userId: session.user.id,
              userData: session.user
            };
          }
        } catch (e) {
          sessionMethod.error = e.message;
        }
        
        // Method 2: auth.getUser()
        let userMethod = {
          name: 'auth.getUser()',
          success: false,
          error: 'Auth session missing!',
          userId: null
        };
        
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!error && user) {
            userMethod = {
              name: 'auth.getUser()',
              success: true,
              userId: user.id,
              userData: user
            };
          }
        } catch (e) {
          userMethod.error = e.message;
        }
        
        // Method 3: Direct query to profiles table
        let profileMethod = {
          name: 'Direct Query (profiles)',
          success: false,
          error: 'Failed to query profiles table',
          userId: null
        };
        
        try {
          const { data, error } = await supabase.from('profiles').select('*').limit(1);
          if (!error && data && data.length > 0) {
            profileMethod = {
              name: 'Direct Query (profiles)',
              success: true,
              userId: data[0].id,
              userData: data[0]
            };
          }
        } catch (e) {
          profileMethod.error = e.message;
        }
        
        // If we have a forced user ID, add it as a method
        let forcedMethod = null;
        if (forcedUserId) {
          forcedMethod = {
            name: 'Forced User ID (localStorage)',
            success: true,
            userId: forcedUserId,
            userData: { email: 'hughes7370@gmail.com' }
          };
        }
        
        // Set the auth methods
        const methods = [sessionMethod, userMethod, profileMethod];
        if (forcedMethod) {
          methods.push(forcedMethod);
        }
        setAuthMethods(methods);
        
        // Check if there's an identity mismatch
        const successfulMethods = methods.filter(m => m.success);
        const uniqueUserIds = [...new Set(successfulMethods.map(m => m.userId))];
        setIdentityMismatch(uniqueUserIds.length > 1);
        
        // Set direct query user for reference
        if (profileMethod.success) {
          setDirectQueryUser(profileMethod.userData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking user:', error);
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear Supabase auth
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local storage
      localStorage.clear();
      
      // Clear cookies related to auth
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      setMessage('Signed out successfully. Please log in again.');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setMessage(`Error signing out: ${error.message}`);
    }
  };

  const forceSetUserId = async (userId) => {
    try {
      setMessage(`Attempting to force set user ID to: ${userId}`);
      
      // Store the user ID in local storage
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: {
          user: {
            id: userId,
            email: 'hughes7370@gmail.com'
          }
        }
      }));
      
      // Force refresh the page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setMessage(`Error setting user ID: ${error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">User Identity Check</h1>
      
      {loading ? (
        <p>Checking user identity...</p>
      ) : (
        <>
          {identityMismatch && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
              <h2 className="text-xl font-bold">Identity Mismatch Detected</h2>
              <p className="mb-2">You appear to be logged in as a different user than you expect. This can happen when:</p>
              <ul className="list-disc ml-5 mb-2">
                <li>You have multiple browser tabs with different users logged in</li>
                <li>Your browser has cached authentication for another user</li>
                <li>Your custom authentication setup is returning the wrong user</li>
              </ul>
              <p>Use the "Sign Out Completely" button below to clear all sessions and then log in again as the correct user.</p>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Authentication Methods</h2>
            <p className="text-sm text-gray-600 mb-4">Different ways of detecting who you're logged in as</p>
            
            <div className="space-y-4">
              {authMethods.map((method) => (
                <div key={method.name} className="border p-4 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{method.name}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${method.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {method.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  {method.success ? (
                    <div>
                      <p><strong>User ID:</strong> {method.userId}</p>
                      {method.name === 'Direct Query (profiles)' && method.userData && (
                        <p><strong>Name:</strong> {method.userData.name}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600">{method.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Sign Out Completely
              </button>
              
              <Link href="/debug-auth" legacyBehavior>
                <a className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                  Authentication Debug
                </a>
              </Link>
              
              <Link href="/test-messaging" legacyBehavior>
                <a className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                  Test Messaging
                </a>
              </Link>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Force User ID</h2>
            <p className="mb-2">Use this option only if you're certain about your correct user ID:</p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => forceSetUserId('58f4abb0-f2df-4905-b99e-041fd0694895')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              >
                Force Login as hughes7370@gmail.com
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">This will attempt to override the current session with your correct user ID.</p>
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded">
              {message}
            </div>
          )}
        </>
      )}
    </div>
  );
} 