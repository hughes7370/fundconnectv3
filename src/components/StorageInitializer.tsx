'use client';

import { useEffect, useState } from 'react';
import { ensureProfilePhotosBucket } from '@/utils/setupStorage';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function StorageInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    async function initializeStorage() {
      try {
        console.log('Initializing storage...');
        const success = await ensureProfilePhotosBucket();
        
        if (success) {
          console.log('Storage initialization successful');
          setInitialized(true);
        } else {
          console.error('Storage initialization failed');
          
          // Check if user is authenticated using Supabase directly
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              setError('You need to be signed in to use storage features.');
              setErrorDetails('Please sign in to your account to upload and view profile photos.');
            } else {
              setError('Failed to initialize storage. Some features may not work correctly.');
              setErrorDetails('The storage policies may not be properly configured. Please contact the administrator.');
            }
          } catch (sessionError) {
            console.error('Error checking session:', sessionError);
            setError('Failed to check authentication status.');
            setErrorDetails(`Error: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
          }
        }
      } catch (err) {
        console.error('Error initializing storage:', err);
        
        // Check if this is an RLS policy error
        if (err instanceof Error && 
            err.message && (
              err.message.includes('row-level security') ||
              err.message.includes('violates row-level security policy')
            )) {
          setError('Storage permission error');
          setErrorDetails('The storage policies are not properly configured. Please contact the administrator.');
        } else {
          setError('An unexpected error occurred while initializing storage.');
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }
      }
    }

    initializeStorage();
  }, []);

  // Only render error message if there's an error
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md max-w-md z-50">
        <div className="flex">
          <div className="py-1">
            <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">Storage Initialization Error</h3>
            <p className="mt-2">{errorDetails || 'Failed to initialize storage. Please check your configuration.'}</p>
            <p className="mt-2">
              Visit the{' '}
              <Link href="/dashboard/storage-test" className="underline font-medium">
                Storage Test Page
              </Link>{' '}
              for troubleshooting or see the{' '}
              <Link href="/STORAGE_GUIDE.md" className="underline font-medium">
                Storage Guide
              </Link>{' '}
              for setup instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Return null when no error (component doesn't need to render anything)
  return null;
} 