import { supabase } from './supabase';

/**
 * Ensures that the profile_photos bucket exists in Supabase Storage
 * and has the correct permissions.
 * 
 * @returns Promise<boolean> - true if bucket is ready, false otherwise
 */
export async function ensureProfilePhotosBucket(): Promise<boolean> {
  console.log('Ensuring profile_photos bucket exists...');
  console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // First check if we're authenticated
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Session check:', sessionData?.session ? 'Authenticated' : 'Not authenticated');
    
    if (!sessionData?.session) {
      console.error('User is not authenticated. Please sign in first.');
      return false;
    }
    
    // Check if bucket exists
    console.log('Checking if bucket exists...');
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error('Error checking buckets:', getBucketsError);
      if (getBucketsError.message.includes('JWT')) {
        console.error('Authentication error. Please sign in again.');
        return false;
      }
      
      // If we can't list buckets, assume the bucket might exist and try to use it anyway
      console.log('Unable to list buckets. Attempting to use profile_photos bucket anyway...');
      return await testBucketAccess();
    }
    
    console.log('Available buckets:', buckets?.map(b => b.name).join(', ') || 'None');
    const bucketExists = buckets?.some(bucket => bucket.name === 'profile_photos') || false;
    console.log('Bucket exists:', bucketExists);
    
    // If bucket doesn't exist, we can't create it from the client
    // The bucket should be created by the admin
    if (!bucketExists) {
      console.error('The profile_photos bucket does not exist. Please contact the administrator.');
      return false;
    }
    
    // Test bucket access
    return await testBucketAccess();
  } catch (error) {
    console.error('Unexpected error setting up storage:', error);
    return false;
  }
}

/**
 * Tests if we can access the profile_photos bucket by attempting to upload a test file
 */
async function testBucketAccess(): Promise<boolean> {
  console.log('Testing bucket access...');
  
  // Create a small test file (1x1 transparent pixel)
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const testFile = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Try multiple paths for upload
  const testPaths = [
    `public/permission_test_${Date.now()}.png`,
    `test_${Date.now()}.png`,
    `${Date.now()}.png`
  ];
  
  for (const testPath of testPaths) {
    try {
      console.log(`Attempting to upload test file to: ${testPath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(testPath, testFile, {
          contentType: 'image/png',
          upsert: true
        });
        
      if (uploadError) {
        console.error(`Upload to ${testPath} failed:`, uploadError);
        
        // Check if this is an RLS policy error
        if (uploadError.message && (
            uploadError.message.includes('row-level security') ||
            uploadError.message.includes('violates row-level security policy')
        )) {
          console.error('RLS policy error detected. The storage policies are not properly configured.');
          console.error('Please follow the instructions in STORAGE_SETUP.md to set up the storage policies.');
          return false;
        }
        
        continue; // Try next path
      }
      
      console.log(`Upload to ${testPath} successful:`, uploadData);
      
      // Clean up test file
      try {
        const { error: deleteError } = await supabase.storage
          .from('profile_photos')
          .remove([testPath]);
          
        if (deleteError) {
          console.warn('Could not delete test file:', deleteError);
        } else {
          console.log('Test file deleted successfully');
        }
      } catch (deleteError) {
        console.warn('Error during test file cleanup:', deleteError);
      }
      
      return true; // Successfully uploaded to this path
    } catch (error) {
      console.error(`Error during upload to ${testPath}:`, error);
    }
  }
  
  console.error('All upload attempts failed. Please check your bucket permissions.');
  console.error('The storage policies are not properly configured. Please follow the instructions in STORAGE_SETUP.md.');
  return false;
} 