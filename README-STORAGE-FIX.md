# Quick Fix for Storage Initialization Error

If you're seeing the error message:

```
Storage Initialization Error
Failed to initialize storage. Some features may not work correctly.
```

Follow these steps to fix it:

## Step 1: Run the Setup Script

The quickest way to fix this issue is to run our setup script:

```bash
node scripts/setup-storage.js
```

When prompted, enter your Supabase service role key (not the anon key).

## Step 2: Set Up Storage Policies Manually

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

## Step 3: Restart Your Application

After setting up the policies, restart your application:

```bash
npm run dev
```

## Step 4: Test the Storage

Once your application is running, go to the Storage Test page to verify that the storage is working correctly.

## Still Having Issues?

If you're still experiencing problems, please refer to the detailed [Storage Setup Guide](./STORAGE_SETUP.md) for more information and alternative solutions.

## What Happened?

This error occurs when the application can't access or create the storage bucket in Supabase. This can happen for several reasons:

1. The bucket doesn't exist
2. The Row Level Security (RLS) policies are not properly configured
3. You don't have the necessary permissions

The setup script creates the bucket and the public folder, but you need to manually set up the RLS policies through the Supabase dashboard.

## Need More Help?

If you need further assistance, please contact support with the following information:
- The exact error message from the browser console
- Your Supabase project ID (but not your API keys)
- Steps you've already taken to try to resolve the issue 