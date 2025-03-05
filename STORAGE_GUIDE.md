# Fund Connect Storage System Guide

## Overview

Fund Connect uses Supabase Storage for managing user profile pictures and other file uploads. This guide explains how the storage system works, common issues you might encounter, and how to troubleshoot them.

## How It Works

### Storage Architecture

1. **Buckets**: Files are stored in a Supabase Storage bucket called `profile_photos`.
2. **Access Control**: Row-Level Security (RLS) policies control who can upload, view, update, and delete files.
3. **File Structure**: Files are stored with a specific path structure to ensure proper organization and access control.

### Components

- **StorageInitializer**: Ensures the storage system is properly initialized when the application loads.
- **StoragePolicyChecker**: Tests if the storage policies are correctly configured.
- **StorageTest**: Allows testing file uploads and downloads.
- **PersonalInfoForm**: Handles profile picture uploads as part of the user profile management.

## Setup Instructions

### Initial Setup

1. Run the setup script to create the necessary storage bucket and policies:
   ```
   node scripts/setup-storage.js
   ```

2. Verify the setup by visiting the Storage Test page at `/dashboard/storage-test`.

### Manual Setup (if needed)

If the automatic setup doesn't work, you can manually configure the storage system:

1. **Create the Bucket**:
   - Go to the Supabase dashboard
   - Navigate to Storage
   - Create a new bucket named `profile_photos`
   - Set it to public

2. **Configure RLS Policies**:
   - For the `profile_photos` bucket, create the following policies:
     - INSERT policy with expression: `bucket_id = 'profile_photos'`
     - UPDATE policy with expression: `bucket_id = 'profile_photos'`
     - DELETE policy with expression: `bucket_id = 'profile_photos'`
     - SELECT policy with expression: `bucket_id = 'profile_photos'`

## Common Issues and Solutions

### Storage Initialization Error

**Symptoms**: 
- Error message: "Storage Initialization Error"
- Unable to upload profile pictures
- Console errors related to storage access

**Causes**:
1. Missing storage bucket
2. Incorrect RLS policies
3. Authentication issues

**Solutions**:
1. Run the setup script: `node scripts/setup-storage.js`
2. Manually configure the bucket and policies as described above
3. Check if you're properly authenticated
4. Visit the Storage Test page to diagnose specific issues

### JSON Parsing Error

**Symptoms**:
- Error message: "Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
- Storage initialization fails

**Causes**:
1. The application is expecting a JSON response but is receiving an HTML page
2. This often happens when there's a server-side error or redirection
3. Authentication session issues

**Solutions**:
1. Make sure you're properly authenticated (try logging out and back in)
2. Clear your browser cache and cookies
3. Check your network tab in developer tools for any 404 or 500 errors
4. Restart the application server
5. If the issue persists, run the storage setup script again: `node scripts/setup-storage.js`

### Row-Level Security (RLS) Policy Error

**Symptoms**:
- Error message: "new row violates row-level security policy"
- Failed uploads with 403 errors

**Solutions**:
1. Verify that all required policies are set up correctly
2. Use the Storage Policy Checker to test your policies
3. Try uploading to alternative paths (the system will attempt this automatically)
4. Check if your user role has the necessary permissions

### File Upload Issues

**Symptoms**:
- Files upload but aren't visible
- Upload appears to succeed but the image doesn't display

**Solutions**:
1. Check browser console for errors
2. Verify file size (max 5MB) and format (JPEG, PNG, GIF, WebP)
3. Try uploading a different file
4. Clear browser cache and try again

## Debugging Tools

### Storage Test Page

Visit `/dashboard/storage-test` to access tools for testing and troubleshooting storage functionality:

- **Storage Policy Checker**: Tests if your storage policies are correctly configured
- **Storage Test Component**: Allows manual testing of file uploads and downloads

### Console Logging

The storage system includes detailed console logging to help diagnose issues:
- Check your browser's developer console for messages starting with "Storage:"
- Look for specific error messages that indicate the nature of the problem

## For Developers

### File Structure

- `src/utils/setupStorage.ts`: Core utility for setting up and verifying storage
- `src/components/StorageInitializer.tsx`: Component that initializes storage on app load
- `src/components/StoragePolicyChecker.tsx`: Component for testing storage policies
- `src/components/StorageTest.tsx`: Component for testing storage functionality
- `src/app/api/storage/check/route.ts`: API endpoint for checking storage policies
- `scripts/setup-storage.js`: Script for setting up storage bucket and policies

### Customizing Storage

If you need to customize the storage system:

1. **Change Bucket Name**: Update the bucket name in `setupStorage.ts` and all references
2. **Modify Policies**: Update the policies in the setup script and documentation
3. **Change File Structure**: Update the path generation in `PersonalInfoForm.tsx`

## Support

If you encounter issues not covered in this guide:

1. Check the console logs for specific error messages
2. Visit the Storage Test page to run diagnostics
3. Contact the development team with details of the issue and any error messages

---

*Last Updated: [Current Date]* 