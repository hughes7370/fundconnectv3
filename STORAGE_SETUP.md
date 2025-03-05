# Storage Setup Guide

This guide will help you resolve the "Storage Initialization Error" that you may encounter when using the Fund Connect platform.

## Understanding the Error

The error "Failed to initialize storage. Some features may not work correctly." typically occurs when:

1. The Supabase storage bucket doesn't exist
2. The Row Level Security (RLS) policies are not properly configured
3. The user doesn't have permission to access or create the bucket

## Solution 1: Use the Direct Setup Script + Manual Policy Setup (Recommended)

We've created a dedicated setup script that directly interacts with the Supabase API to set up the storage bucket. This is the most reliable method:

```bash
# Make sure you're in the project root directory
node scripts/setup-storage.js
```

When prompted, enter your Supabase service role key. This script will:
- Check if the bucket exists and create it if needed
- Create the public folder
- Test the upload functionality to verify everything works

### After Running the Script: Manual Policy Setup

After running the script, you'll need to manually set up the storage policies in the Supabase dashboard:

1. Go to [https://app.supabase.com](https://app.supabase.com) and select your project
2. Go to "Storage" in the left sidebar
3. Click on "Policies" in the left sidebar
4. Create the following policies for the `profile_photos` bucket:

   - **Policy Name**: "Anyone can upload profile photos"  
     **Operation**: INSERT  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Anyone can update profile photos"  
     **Operation**: UPDATE  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Anyone can delete profile photos"  
     **Operation**: DELETE  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Profile photos are publicly accessible"  
     **Operation**: SELECT  
     **Using expression**: `bucket_id = 'profile_photos'`

### Finding Your Service Role Key

1. Go to your Supabase project dashboard
2. Click on "Project Settings" in the left sidebar
3. Click on "API" in the submenu
4. Copy the "service_role key" (not the anon/public key)

## Solution 2: Apply the Migration Script (Alternative)

If you prefer to use the migration approach, you can run:

```bash
# Make sure you're in the project root directory
node scripts/apply-migrations.js
```

This script will:
- Create the `profile_photos` bucket if it doesn't exist
- Set up permissive RLS policies for the bucket
- Create a `public` folder in the bucket

### Common Migration Errors

If you see the following error:
```
ERROR: 428C9: cannot insert a non-DEFAULT value into column "path_tokens"
DETAIL: Column "path_tokens" is a generated column.
```

This error has been fixed in the latest version of the migration script. Make sure you're using the most recent version from the repository.

If you see:
```
Error applying migrations: Command failed: /path/to/temp-migration.sh
```

This indicates that the migration script couldn't execute properly. Try using the direct setup script (Solution 1) instead.

## Solution 3: Manual Setup via Supabase Dashboard

If the script doesn't work, you can manually set up the storage through the Supabase dashboard:

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to "Storage" in the left sidebar
4. Click "New Bucket"
5. Enter "profile_photos" as the bucket name
6. Check "Public bucket" to make it publicly accessible
7. Click "Create bucket"
8. After creating the bucket, click on "Policies" in the left sidebar
9. Create the following policies for the `profile_photos` bucket (same as above):

   - **Policy Name**: "Anyone can upload profile photos"  
     **Operation**: INSERT  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Anyone can update profile photos"  
     **Operation**: UPDATE  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Anyone can delete profile photos"  
     **Operation**: DELETE  
     **Using expression**: `bucket_id = 'profile_photos'`

   - **Policy Name**: "Profile photos are publicly accessible"  
     **Operation**: SELECT  
     **Using expression**: `bucket_id = 'profile_photos'`

10. Create a folder named "public" inside the `profile_photos` bucket by:
    - Click on the `profile_photos` bucket
    - Click "Create Folder"
    - Enter "public" as the folder name
    - Click "Create"

## Code Updates for Better Error Handling

We've updated the code to be more resilient to permission issues:

1. The `setupStorage.ts` file now includes better error handling and debugging
2. The `PersonalInfoForm.tsx` component tries multiple upload paths if the first one fails
3. The `StorageInitializer.tsx` component provides better error feedback
4. The `StorageTest.tsx` component now shows detailed error information

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Ensure your Supabase URL and API key are correct in `.env.local`
3. Make sure you're authenticated before trying to upload files
4. Try uploading to different paths (e.g., `public/filename.jpg` or just `filename.jpg`)
5. If you're getting permission errors, make sure you're using the service_role key for admin operations

### Testing Storage Functionality

You can use the Storage Test component in the application to verify that the storage is working correctly. This will:
- Test if the bucket exists
- Try to upload a test file
- Show detailed error information if something goes wrong

## Need More Help?

If you're still having issues, please contact support with the following information:
- The exact error message from the browser console
- Your Supabase project ID (but not your API keys)
- Steps you've already taken to try to resolve the issue 