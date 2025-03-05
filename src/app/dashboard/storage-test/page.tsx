'use client';

import { useState } from 'react';
import StorageTest from '@/components/StorageTest';
import StoragePolicyChecker from '@/components/StoragePolicyChecker';
import Link from 'next/link';

export default function StorageTestPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Storage Test & Troubleshooting</h1>
      
      <div className="mb-8">
        <p className="text-gray-700 mb-4">
          This page helps you test and troubleshoot storage functionality in the Fund Connect platform.
          If you're experiencing issues with profile photo uploads or seeing storage initialization errors,
          use the tools below to diagnose and fix the problem.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700 font-medium">Administrator Instructions</p>
          <p className="text-sm text-blue-600 mt-1">
            If you're seeing storage errors, you need to set up the storage policies for the profile_photos bucket.
            Follow the instructions in the <Link href="/STORAGE_SETUP.md" className="underline">Storage Setup Guide</Link>.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <StoragePolicyChecker />
        </div>
        
        <div>
          <StorageTest />
        </div>
      </div>
      
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Common Issues & Solutions</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Row-Level Security Policy Error</h3>
            <p className="text-sm text-gray-600">
              This error occurs when the storage policies are not properly configured.
              You need to set up the following policies for the profile_photos bucket:
            </p>
            <ul className="text-sm list-disc list-inside mt-1 ml-4">
              <li>INSERT policy with expression: <code>bucket_id = 'profile_photos'</code></li>
              <li>UPDATE policy with expression: <code>bucket_id = 'profile_photos'</code></li>
              <li>DELETE policy with expression: <code>bucket_id = 'profile_photos'</code></li>
              <li>SELECT policy with expression: <code>bucket_id = 'profile_photos'</code></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium">Bucket Does Not Exist</h3>
            <p className="text-sm text-gray-600">
              This error occurs when the profile_photos bucket has not been created.
              Run the setup script or create the bucket manually through the Supabase dashboard.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Authentication Error</h3>
            <p className="text-sm text-gray-600">
              You need to be signed in to use storage features.
              If you're seeing authentication errors, try signing out and signing back in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 