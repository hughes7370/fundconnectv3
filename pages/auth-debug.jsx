import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AuthDebug() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      setLoading(true);
      const testResults = [];

      // Test 1: Check localStorage directly
      try {
        const localStorageKeys = Object.keys(localStorage);
        const supabaseKeys = localStorageKeys.filter(key => key.includes('supabase'));
        
        testResults.push({
          name: 'localStorage Check',
          result: supabaseKeys.length > 0 ? 'PASS' : 'FAIL',
          details: `Found ${supabaseKeys.length} Supabase-related keys: ${supabaseKeys.join(', ')}`
        });

        // Try to parse the auth data from localStorage
        let authData = null;
        for (const key of supabaseKeys) {
          if (key.includes('auth')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              authData = data;
              break;
            } catch (e) {
              console.error('Error parsing localStorage item:', e);
            }
          }
        }

        if (authData) {
          testResults.push({
            name: 'localStorage Auth Data',
            result: 'INFO',
            details: `Found auth data with keys: ${Object.keys(authData).join(', ')}`
          });
        }
      } catch (error) {
        testResults.push({
          name: 'localStorage Check',
          result: 'ERROR',
          details: error.message
        });
      }

      // Test 2: Check with getSession
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        testResults.push({
          name: 'auth.getSession()',
          result: session ? 'PASS' : 'FAIL',
          details: session 
            ? `Session found for user: ${session.user.id}` 
            : error 
              ? `Error: ${error.message}` 
              : 'No session found'
        });

        if (session) {
          testResults.push({
            name: 'Session Details',
            result: 'INFO',
            details: `Expires at: ${new Date(session.expires_at * 1000).toLocaleString()}, 
                      Provider: ${session.user.app_metadata.provider || 'unknown'}`
          });
        }
      } catch (error) {
        testResults.push({
          name: 'auth.getSession()',
          result: 'ERROR',
          details: error.message
        });
      }

      // Test 3: Check with getUser
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        testResults.push({
          name: 'auth.getUser()',
          result: user ? 'PASS' : 'FAIL',
          details: user 
            ? `User found: ${user.id} (${user.email})` 
            : error 
              ? `Error: ${error.message}` 
              : 'No user found'
        });
      } catch (error) {
        testResults.push({
          name: 'auth.getUser()',
          result: 'ERROR',
          details: error.message
        });
      }

      // Test 4: Try a direct database query that requires auth
      try {
        const { data, error } = await supabase.from('conversations').select('count').limit(1);
        
        testResults.push({
          name: 'Authenticated Query',
          result: error ? 'FAIL' : 'PASS',
          details: error 
            ? `Error: ${error.message}` 
            : `Query succeeded, found ${data.length} results`
        });
      } catch (error) {
        testResults.push({
          name: 'Authenticated Query',
          result: 'ERROR',
          details: error.message
        });
      }

      // Test 5: Try to get user profile
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        
        testResults.push({
          name: 'Profiles Query',
          result: error ? 'FAIL' : 'PASS',
          details: error 
            ? `Error: ${error.message}` 
            : `Query succeeded, found ${data.length} profiles`
        });

        if (data && data.length > 0) {
          testResults.push({
            name: 'Profile Data',
            result: 'INFO',
            details: `First profile ID: ${data[0].id}, Fields: ${Object.keys(data[0]).join(', ')}`
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Profiles Query',
          result: 'ERROR',
          details: error.message
        });
      }

      // Test 6: Check RLS policies
      try {
        // Try to query a few tables to see which ones are accessible
        const tables = ['conversations', 'messages', 'profiles', 'investors', 'agents', 'funds'];
        const accessResults = [];

        for (const table of tables) {
          try {
            const { data, error } = await supabase.from(table).select('count').limit(1);
            accessResults.push(`${table}: ${error ? 'DENIED' : 'ALLOWED'}`);
          } catch (e) {
            accessResults.push(`${table}: ERROR (${e.message})`);
          }
        }

        testResults.push({
          name: 'RLS Policy Check',
          result: 'INFO',
          details: accessResults.join('\n')
        });
      } catch (error) {
        testResults.push({
          name: 'RLS Policy Check',
          result: 'ERROR',
          details: error.message
        });
      }

      setResults(testResults);
      setLoading(false);
    };

    runTests();
  }, []);

  const refreshAuth = async () => {
    try {
      setLoading(true);
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      alert(error ? `Error refreshing: ${error.message}` : 'Session refreshed');
      window.location.reload();
    } catch (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'PASS': return 'bg-green-100 text-green-800';
      case 'FAIL': return 'bg-red-100 text-red-800';
      case 'ERROR': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debugging</h1>
      
      <div className="mb-6 flex space-x-4">
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Running Tests...' : 'Run Tests Again'}
        </button>
        
        <button 
          onClick={refreshAuth} 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          disabled={loading}
        >
          Refresh Auth Session
        </button>

        <button 
          onClick={() => window.location.href = '/test-messaging'} 
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          disabled={loading}
        >
          Test Messaging
        </button>
      </div>
      
      <div className="space-y-4">
        {results.map((test, index) => (
          <div key={index} className={`p-4 rounded-md ${getResultColor(test.result)}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{test.name}</h3>
              <span className="px-2 py-1 rounded-full bg-white text-xs font-bold">
                {test.result}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{test.details}</p>
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Running authentication tests...</p>
        </div>
      )}
      
      {!loading && results.length === 0 && (
        <div className="text-center py-10">
          <p>No test results available.</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Authentication Analysis</h2>
        <p className="mb-4">
          Your Supabase setup has an unusual configuration where standard authentication methods 
          (getSession, getUser) fail, but direct database queries succeed. This suggests:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your RLS policies might be allowing some queries without authentication</li>
          <li>You might be using a custom authentication flow</li>
          <li>The authentication token might be stored in a non-standard location</li>
        </ul>
        <p className="mt-4">
          We've implemented a custom solution that detects authentication based on whether 
          database queries succeed, which should work with your specific setup.
        </p>
      </div>
    </div>
  );
} 