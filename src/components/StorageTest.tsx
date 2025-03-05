'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { ensureProfilePhotosBucket } from '@/utils/setupStorage';
import Link from 'next/link';

export default function StorageTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);

  const testStorage = async () => {
    setLoading(true);
    setResult(null);
    setFileUrl(null);
    setDetailedError(null);
    
    try {
      // First check if we're authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setResult({
          success: false,
          message: 'You must be signed in to test storage functionality.'
        });
        return;
      }
      
      console.log('Starting storage test...');
      console.log('Session:', sessionData?.session ? 'Authenticated' : 'Not authenticated');
      
      // First ensure the bucket exists
      const bucketReady = await ensureProfilePhotosBucket();
      
      if (!bucketReady) {
        console.error('Bucket initialization failed');
        setResult({
          success: false,
          message: 'Failed to initialize storage bucket. Please check console for details and follow the manual setup instructions.'
        });
        return;
      }
      
      // Create a test file (1x1 transparent pixel)
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const testFile = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Try multiple upload paths
      const testPaths = [
        `public/test_${Date.now()}.png`,
        `test_${Date.now()}.png`,
        `${Date.now()}.png`
      ];
      
      let uploadSuccess = false;
      let successPath = '';
      let lastError = null;
      
      for (const testPath of testPaths) {
        try {
          console.log(`Attempting upload to: ${testPath}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(testPath, testFile, {
              contentType: 'image/png',
              upsert: true
            });
            
          if (uploadError) {
            console.error(`Upload error for ${testPath}:`, uploadError);
            lastError = uploadError;
            continue; // Try next path
          }
          
          console.log(`Upload successful to ${testPath}:`, uploadData);
          
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(testPath);
            
          setFileUrl(urlData.publicUrl);
          uploadSuccess = true;
          successPath = testPath;
          break; // Exit the loop on success
        } catch (err) {
          console.error(`Error during upload to ${testPath}:`, err);
          lastError = err;
        }
      }
      
      if (!uploadSuccess) {
        setDetailedError(lastError ? JSON.stringify(lastError, null, 2) : 'Unknown error');
        setResult({
          success: false,
          message: `All upload attempts failed. Please check your bucket permissions and follow the manual setup instructions.`
        });
        return;
      }
      
      setResult({
        success: true,
        message: `File uploaded successfully to: ${successPath}`
      });
      
      // Clean up after 10 seconds
      setTimeout(async () => {
        try {
          const { error: deleteError } = await supabase.storage
            .from('profile_photos')
            .remove([successPath]);
            
          if (deleteError) {
            console.warn('Could not delete test file:', deleteError);
          } else {
            console.log('Test file deleted successfully');
            setResult(prev => prev ? {
              ...prev,
              message: `${prev.message} (File has been automatically deleted)`
            } : null);
            setFileUrl(null);
          }
        } catch (err) {
          console.error('Error cleaning up test file:', err);
        }
      }, 10000);
      
    } catch (err) {
      console.error('Test error:', err);
      setDetailedError(err instanceof Error ? err.stack || err.message : String(err));
      setResult({
        success: false,
        message: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Storage Test</h2>
      
      <button
        onClick={testStorage}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? 'Testing...' : 'Test Storage'}
      </button>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <p className="font-medium">{result.success ? 'Success!' : 'Error!'}</p>
          <p>{result.message}</p>
          
          {!result.success && (
            <div className="mt-2">
              <p className="text-sm">Please follow the <Link href="/STORAGE_SETUP.md" className="underline font-medium">manual setup instructions</Link> to resolve this issue.</p>
            </div>
          )}
        </div>
      )}
      
      {detailedError && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Detailed Error Information:</p>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
            {detailedError}
          </pre>
        </div>
      )}
      
      {fileUrl && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Test Image:</p>
          <div className="border border-gray-200 inline-block p-1">
            <img src={fileUrl} alt="Test" width={50} height={50} className="bg-gray-100" />
          </div>
        </div>
      )}
    </div>
  );
} 