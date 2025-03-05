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
      const response = await fetch('/api/storage/check');
      const data = await response.json();
      
      setResult({
        success: data.success,
        message: data.message,
        error: data.error,
        details: data.details
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to check storage policies',
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
              <p className="font-medium text-red-600">Required policies:</p>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>INSERT policy with expression: <code>bucket_id = 'profile_photos'</code></li>
                <li>UPDATE policy with expression: <code>bucket_id = 'profile_photos'</code></li>
                <li>DELETE policy with expression: <code>bucket_id = 'profile_photos'</code></li>
                <li>SELECT policy with expression: <code>bucket_id = 'profile_photos'</code></li>
              </ul>
              <p className="mt-2 text-sm">
                See the{' '}
                <Link href="/STORAGE_GUIDE.md" className="text-blue-600 underline">
                  Storage Guide
                </Link>{' '}
                for setup instructions.
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