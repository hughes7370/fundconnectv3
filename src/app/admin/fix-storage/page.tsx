'use client';

import { useState, useEffect } from 'react';
import { fixStoragePermissions } from '@/utils/fixStoragePermissions';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';

export default function FixStoragePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [bucketInfo, setBucketInfo] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if the user is an admin
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }
      
      // Get the user's role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (!userError && userData && userData.role === 'admin') {
        setIsAdmin(true);
      }
    }
    
    checkAdmin();
  }, []);

  // Get bucket information
  useEffect(() => {
    async function getBucketInfo() {
      try {
        const { data: buckets, error: bucketsError } = await supabase
          .storage
          .listBuckets();
          
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
          return;
        }
        
        // Check if the fund-documents bucket exists
        const fundDocumentsBucket = buckets?.find(bucket => bucket.name === 'fund-documents');
        
        if (fundDocumentsBucket) {
          setBucketInfo(fundDocumentsBucket);
        }
      } catch (err) {
        console.error('Error getting bucket info:', err);
      }
    }
    
    getBucketInfo();
  }, []);

  const handleFixPermissions = async () => {
    setLoading(true);
    try {
      const result = await fixStoragePermissions();
      setResult(result);
      
      // Refresh bucket info
      const { data: buckets } = await supabase.storage.listBuckets();
      const fundDocumentsBucket = buckets?.find(bucket => bucket.name === 'fund-documents');
      if (fundDocumentsBucket) {
        setBucketInfo(fundDocumentsBucket);
      }
    } catch (err) {
      setResult({ 
        success: false, 
        message: `Error: ${err instanceof Error ? err.message : String(err)}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Storage Permissions Fix</h1>
        
        <div className="py-4">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Fix Supabase Storage Permissions
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                This tool will update the fund-documents bucket to be public and set appropriate policies.
              </p>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {!isAdmin && (
                <div className="rounded-md bg-yellow-50 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Admin Access Required</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You need admin privileges to run this tool. Some operations may fail without proper permissions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {bucketInfo && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Bucket Information:</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><span className="font-medium">Name:</span> {bucketInfo.name}</p>
                    <p><span className="font-medium">Public:</span> {bucketInfo.public ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Created At:</span> {new Date(bucketInfo.created_at).toLocaleString()}</p>
                    {bucketInfo.file_size_limit && (
                      <p><span className="font-medium">File Size Limit:</span> {Math.round(bucketInfo.file_size_limit / (1024 * 1024))}MB</p>
                    )}
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleFixPermissions}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Fix Storage Permissions'
                )}
              </button>
              
              {result && (
                <div className={`mt-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'} p-4`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {result.success ? (
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.success ? 'Success' : 'Error'}
                      </h3>
                      <div className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        <p>{result.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Manual Steps in Supabase Dashboard:</h3>
              <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2">
                <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark">Supabase Dashboard</a></li>
                <li>Select your project</li>
                <li>Click on "Storage" in the left sidebar</li>
                <li>Select the "fund-documents" bucket</li>
                <li>Click on "Policies" tab</li>
                <li>Add the following policies:
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>SELECT policy:</strong> Set to <code className="bg-gray-100 px-1 rounded">true</code> to allow public read access</li>
                    <li><strong>INSERT policy:</strong> Set to <code className="bg-gray-100 px-1 rounded">auth.role() = 'authenticated'</code> to allow authenticated users to upload</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 