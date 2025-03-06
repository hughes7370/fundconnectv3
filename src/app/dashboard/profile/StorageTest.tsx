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
      // Step 1: Check authentication
      setStatus('Step 1: Checking authentication...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated. Please sign in first.');
      }
      
      setStatus(`Step 1: Authenticated as ${session.user.email}`);
      
      // Step 2: Check if bucket exists
      setStatus('Step 2: Checking if bucket exists...');
      
      try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          setStatus(`Warning: Error listing buckets: ${listError.message}`);
        } else {
          const profileBucket = buckets.find(b => b.name === 'profile_photos');
          if (profileBucket) {
            setStatus(`Step 2: Found profile_photos bucket: ${JSON.stringify(profileBucket)}`);
          } else {
            setStatus(`Step 2: profile_photos bucket not found in bucket list. Available buckets: ${buckets.map(b => b.name).join(', ')}`);
          }
        }
      } catch (error) {
        setStatus(`Warning: Error checking buckets: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Try to ensure the bucket exists
      const bucketReady = await ensureProfilePhotosBucket();
      
      if (!bucketReady) {
        throw new Error('Failed to create or access bucket');
      }
      
      setStatus(prev => `${prev}\nBucket access check passed`);
      
      // Step 3: Test file upload (image)
      setStatus(prev => `${prev}\nStep 3: Testing image upload...`);
      
      // Create a small test image (1x1 transparent pixel)
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      const testImage = new File([blob], 'test-image.png', { type: 'image/png' });
      
      // Try multiple paths
      const testPaths = [
        `test-${Date.now()}.png`,
        `public/test-${Date.now()}.png`,
        `${session.user.id}/test-${Date.now()}.png`
      ];
      
      let uploadSuccess = false;
      let uploadPath = '';
      let publicUrl = '';
      
      for (const path of testPaths) {
        try {
          setStatus(prev => `${prev}\nTrying upload to: ${path}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(path, testImage, { upsert: true });
          
          if (uploadError) {
            setStatus(prev => `${prev}\nUpload error for ${path}: ${uploadError.message}`);
            continue;
          }
          
          uploadSuccess = true;
          uploadPath = path;
          
          // Get URL for the test file
          const { data: urlData } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(path);
          
          publicUrl = urlData.publicUrl;
          
          setStatus(prev => `${prev}\nUpload successful to ${path}`);
          setStatus(prev => `${prev}\nPublic URL: ${publicUrl}`);
          
          break;
        } catch (error) {
          setStatus(prev => `${prev}\nError for ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (!uploadSuccess) {
        throw new Error('All upload attempts failed');
      }
      
      // Step 4: Test image fetch
      setStatus(prev => `${prev}\nStep 4: Testing image fetch...`);
      
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        if (response.ok) {
          setStatus(prev => `${prev}\nImage fetch successful: ${response.status} ${response.statusText}`);
        } else {
          setStatus(prev => `${prev}\nImage fetch failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        setStatus(prev => `${prev}\nError fetching image: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Step 5: Delete the test file
      setStatus(prev => `${prev}\nStep 5: Deleting test file...`);
      
      try {
        const { error: deleteError } = await supabase.storage
          .from('profile_photos')
          .remove([uploadPath]);
        
        if (deleteError) {
          setStatus(prev => `${prev}\nError deleting test file: ${deleteError.message}`);
        } else {
          setStatus(prev => `${prev}\nTest file deleted successfully`);
        }
      } catch (error) {
        setStatus(prev => `${prev}\nError during deletion: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Final status
      setStatus(prev => `${prev}\n\nStorage test completed!`);
      
    } catch (error) {
      console.error('Storage test error:', error);
      setStatus(prev => `${prev}\n\nError: ${error instanceof Error ? error.message : String(error)}`);
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