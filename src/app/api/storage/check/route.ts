import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to check storage policies.'
      }, { status: 401 });
    }
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to list buckets',
        message: bucketsError.message
      }, { status: 500 });
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'profile_photos');
    
    if (!bucketExists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Bucket does not exist',
        message: 'The profile_photos bucket does not exist. Please contact the administrator.'
      }, { status: 404 });
    }
    
    // Test upload to check policies
    // Create a small test file (1x1 transparent pixel)
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const testFile = Buffer.from(base64Data, 'base64');
    
    // Try multiple paths
    const testPaths = [
      `test_${Date.now()}.png`,
      `public/test_${Date.now()}.png`
    ];
    
    let uploadSuccess = false;
    let successPath = '';
    let lastError = null;
    
    for (const path of testPaths) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile_photos')
          .upload(path, testFile, {
            contentType: 'image/png',
            upsert: true
          });
          
        if (uploadError) {
          lastError = uploadError;
          continue;
        }
        
        // Upload succeeded, now try to delete it
        const { error: deleteError } = await supabase.storage
          .from('profile_photos')
          .remove([path]);
          
        if (!deleteError) {
          uploadSuccess = true;
          successPath = path;
          break;
        }
        
        lastError = deleteError;
      } catch (error) {
        lastError = error;
      }
    }
    
    if (!uploadSuccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Policy check failed',
        message: 'Failed to upload test file. The storage policies may not be properly configured.',
        details: lastError
      }, { status: 403 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Storage policies are correctly configured',
      path: successPath
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
} 