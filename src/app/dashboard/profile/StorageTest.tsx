'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { ensureProfilePhotosBucket } from '@/utils/setupStorage';

export default function StorageTest() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const testStorage = async () => {
    setLoading(true);
    setStatus('Testing Supabase storage...');
    
    try {
      // Step 1: Check if bucket exists
      setStatus('Step 1: Checking if bucket exists...');
      const bucketReady = await ensureProfilePhotosBucket();
      
      if (!bucketReady) {
        throw new Error('Failed to create or access bucket');
      }
      
      setStatus('Step 1: Bucket exists or was created successfully');
      
      // Step 2: List buckets
      setStatus('Step 2: Listing buckets...');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Error listing buckets: ${listError.message}`);
      }
      
      setStatus(`Step 2: Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`);
      
      // Step 3: Create a test file
      setStatus('Step 3: Creating test file...');
      const testContent = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload('test.txt', testFile, { upsert: true });
      
      if (uploadError) {
        throw new Error(`Error uploading test file: ${uploadError.message}`);
      }
      
      setStatus('Step 3: Test file created successfully');
      
      // Step 4: Get URL for the test file
      setStatus('Step 4: Getting URL for test file...');
      const { data: urlData } = supabase.storage
        .from('profile_photos')
        .getPublicUrl('test.txt');
      
      setStatus(`Step 4: Test file URL: ${urlData.publicUrl}`);
      
      // Step 5: Delete the test file
      setStatus('Step 5: Deleting test file...');
      const { error: deleteError } = await supabase.storage
        .from('profile_photos')
        .remove(['test.txt']);
      
      if (deleteError) {
        throw new Error(`Error deleting test file: ${deleteError.message}`);
      }
      
      setStatus('Step 5: Test file deleted successfully');
      
      // Final status
      setStatus('All tests passed! Supabase storage is working correctly.');
      
    } catch (error) {
      console.error('Storage test error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-2">Storage Test</h3>
      
      <div className="mb-4">
        <button
          onClick={testStorage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          {loading ? 'Testing...' : 'Test Storage'}
        </button>
      </div>
      
      {status && (
        <div className="p-3 bg-white rounded border">
          <pre className="whitespace-pre-wrap text-sm">{status}</pre>
        </div>
      )}
    </div>
  );
} 