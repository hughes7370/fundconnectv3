'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StoragePolicyChecker() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    details?: any;
  } | null>(null);

  const checkPolicies = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // First check if the bucket exists by trying to list files
      try {
        const directCheckResponse = await fetch('/api/storage/check');
        if (!directCheckResponse.ok) {
          console.log('Direct bucket check failed:', directCheckResponse.status);
        } else {
          console.log('Direct bucket check succeeded');
        }
      } catch (e) {
        console.log('Error during direct bucket check:', e);
      }
      
      const response = await fetch('/api/storage/check');
      const data = await response.json();
      
      setResult({
        success: data.success,
        message: data.message,
        error: data.error,
        details: data.details
      });
    } catch (error) {
      console.error('Policy check error:', error);
      
      // Provide a more helpful error message
      let errorMessage = 'Failed to check storage policies';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      // Check if this might be a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
      }
      
      setResult({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Storage Policy Checker</h2>
      
      <p className="text-sm text-gray-600 mb-4">
        This tool checks if your storage policies are correctly configured for the profile_photos bucket.
      </p>
      
      <button
        onClick={checkPolicies}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? 'Checking...' : 'Check Policies'}
      </button>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <p className="font-medium">{result.success ? 'Success!' : 'Error!'}</p>
          <p className="text-sm">{result.message}</p>
          
          {!result.success && (
            <div className="mt-4">
              <p className="font-medium text-red-600">Troubleshooting Steps:</p>
              <ol className="list-decimal list-inside text-sm mt-1 space-y-1">
                <li>Check if you're signed in with an account that has the necessary permissions</li>
                <li>Verify that the profile_photos bucket exists in your Supabase project</li>
                <li>Ensure the storage policies are correctly configured</li>
                <li>Try refreshing the page or signing out and back in</li>
              </ol>
              <p className="mt-2 text-sm">
                If the bucket exists and is working for other operations, this might be a permission issue with the bucket check.
                You can safely ignore this error if profile photos are working correctly elsewhere in the application.
              </p>
            </div>
          )}
          
          {result.details && (
            <div className="mt-2">
              <p className="text-xs font-medium">Error Details:</p>
              <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto max-h-32">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 