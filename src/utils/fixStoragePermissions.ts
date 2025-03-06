import { supabase } from './supabase';

/**
 * This script fixes the permissions for the fund-documents storage bucket
 * to ensure that files can be accessed both through the API and public URLs.
 */
export async function fixStoragePermissions() {
  console.log('Checking and fixing storage bucket permissions...');
  
  try {
    // First, check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return { success: false, message: `Error listing buckets: ${bucketsError.message}` };
    }
    
    // Check if the fund-documents bucket exists
    const fundDocumentsBucket = buckets?.find(bucket => bucket.name === 'fund-documents');
    
    if (!fundDocumentsBucket) {
      console.error('fund-documents bucket not found');
      return { success: false, message: 'fund-documents bucket not found' };
    }
    
    console.log('Found fund-documents bucket:', fundDocumentsBucket);
    
    // Update the bucket to be public
    const { error: updateError } = await supabase
      .storage
      .updateBucket('fund-documents', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      });
      
    if (updateError) {
      console.error('Error updating bucket:', updateError);
      return { success: false, message: `Error updating bucket: ${updateError.message}` };
    }
    
    console.log('Successfully updated fund-documents bucket to be public');
    
    // Now check and update the policies
    // Note: This requires admin privileges and might not work with the anon key
    try {
      // Try to create a policy for public access
      const { error: policyError } = await supabase.rpc('create_storage_policy', {
        bucket_name: 'fund-documents',
        policy_name: 'Public Access',
        definition: 'true', // Allow access to all files
        operation: 'SELECT' // For read operations
      });
      
      if (policyError) {
        console.warn('Error creating policy (this might require admin access):', policyError);
      } else {
        console.log('Successfully created public access policy');
      }
    } catch (err) {
      console.warn('Error creating policy (this might require admin access):', err);
    }
    
    return { 
      success: true, 
      message: 'Successfully updated fund-documents bucket to be public. You may need to update policies in the Supabase dashboard.' 
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// If this file is run directly, execute the function
if (typeof window !== 'undefined' && window.location.pathname.includes('fix-storage')) {
  fixStoragePermissions().then(result => {
    console.log('Result:', result);
    alert(`Storage permission update ${result.success ? 'succeeded' : 'failed'}: ${result.message}`);
  });
} 