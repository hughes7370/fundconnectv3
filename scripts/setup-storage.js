#!/usr/bin/env node

/**
 * Fund Connect Storage Setup Script
 * 
 * This script sets up the storage system for Fund Connect, including:
 * - Creating the profile_photos bucket if it doesn't exist
 * - Setting up the necessary RLS policies
 * - Testing the storage system
 * 
 * Usage: node scripts/setup-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check for required environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Please make sure you have the following in your .env.local file:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key> (for admin operations)');
  process.exit(1);
}

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// Create Supabase client with anon key for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to create a test file
function createTestFile() {
  // Create a 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const filePath = path.join(__dirname, 'test-pixel.gif');
  fs.writeFileSync(filePath, pixel);
  return filePath;
}

// Function to delete a test file
function deleteTestFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Main function
async function setupStorage() {
  console.log('🚀 Starting Fund Connect storage setup...');
  
  try {
    // Step 1: Check if the bucket exists
    console.log('\n📦 Checking if profile_photos bucket exists...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }
    
    const profilePhotosBucket = buckets.find(bucket => bucket.name === 'profile_photos');
    
    // Step 2: Create the bucket if it doesn't exist
    if (!profilePhotosBucket) {
      console.log('Creating profile_photos bucket...');
      const { data, error } = await supabaseAdmin.storage.createBucket('profile_photos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      
      console.log('✅ profile_photos bucket created successfully!');
    } else {
      console.log('✅ profile_photos bucket already exists.');
    }
    
    // Step 3: Create public folder
    console.log('\n📂 Creating public folder...');
    const testFilePath = createTestFile();
    
    try {
      const { data, error } = await supabaseAdmin.storage.from('profile_photos').upload('public/test.gif', fs.createReadStream(testFilePath), {
        cacheControl: '3600',
        upsert: true,
      });
      
      if (error) {
        console.warn(`⚠️ Warning: Could not create public folder: ${error.message}`);
      } else {
        console.log('✅ Public folder created successfully!');
        
        // Clean up test file in storage
        await supabaseAdmin.storage.from('profile_photos').remove(['public/test.gif']);
      }
    } catch (err) {
      console.warn(`⚠️ Warning: Could not create public folder: ${err.message}`);
    }
    
    // Step 4: Set up RLS policies
    console.log('\n🔒 Setting up RLS policies...');
    
    // Define the policies to create
    const policies = [
      {
        name: 'Allow public select access',
        operation: 'SELECT',
        expression: "bucket_id = 'profile_photos'",
      },
      {
        name: 'Allow authenticated insert',
        operation: 'INSERT',
        expression: "bucket_id = 'profile_photos' AND auth.role() = 'authenticated'",
      },
      {
        name: 'Allow authenticated update',
        operation: 'UPDATE',
        expression: "bucket_id = 'profile_photos' AND auth.role() = 'authenticated'",
      },
      {
        name: 'Allow authenticated delete',
        operation: 'DELETE',
        expression: "bucket_id = 'profile_photos' AND auth.role() = 'authenticated'",
      },
    ];
    
    console.log('Note: RLS policies must be set up manually in the Supabase dashboard.');
    console.log('Please go to: Storage > Policies > profile_photos');
    console.log('And create the following policies:');
    
    policies.forEach(policy => {
      console.log(`- ${policy.name} (${policy.operation}): ${policy.expression}`);
    });
    
    // Step 5: Test the storage
    console.log('\n🧪 Testing storage access...');
    const { data: testUpload, error: testUploadError } = await supabaseAdmin.storage.from('profile_photos').upload('test-upload.gif', fs.createReadStream(testFilePath), {
      cacheControl: '3600',
      upsert: true,
    });
    
    if (testUploadError) {
      console.warn(`⚠️ Warning: Test upload failed: ${testUploadError.message}`);
      console.warn('This may indicate that the RLS policies are not set up correctly.');
    } else {
      console.log('✅ Test upload successful!');
      
      // Clean up test file
      await supabaseAdmin.storage.from('profile_photos').remove(['test-upload.gif']);
      console.log('✅ Test file cleaned up.');
    }
    
    // Clean up local test file
    deleteTestFile(testFilePath);
    
    console.log('\n✅ Storage setup complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure to set up the RLS policies manually in the Supabase dashboard');
    console.log('2. Restart your application');
    console.log('3. Test the storage functionality at /dashboard/storage-test');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the setup
setupStorage(); 