'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Image from 'next/image';
import { ensureProfilePhotosBucket } from '@/utils/setupStorage';

interface PersonalInfoFormProps {
  userData: any;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
}

// Define an error interface to handle Supabase errors
interface SupabaseError {
  message: string;
  [key: string]: any;
}

export default function PersonalInfoForm({ userData, setUserData }: PersonalInfoFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: userData.name || '',
    phone: userData.phone || '',
    avatar_url: userData.avatar_url || '',
  });
  
  // Add a useEffect to check if the avatar_url is valid
  useEffect(() => {
    const checkAvatarUrl = async () => {
      if (formData.avatar_url) {
        try {
          // Try to fetch the image to see if it's valid
          const response = await fetch(formData.avatar_url, { method: 'HEAD' });
          if (!response.ok) {
            console.warn('Avatar URL is not accessible:', formData.avatar_url);
            setImageError(true);
          } else {
            setImageError(false);
          }
        } catch (error) {
          console.error('Error checking avatar URL:', error);
          setImageError(true);
        }
      }
    };
    
    checkAvatarUrl();
  }, [formData.avatar_url]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    
    // Generate a unique filename that doesn't include the user ID in the path
    // This avoids RLS issues with path-based security
    const fileExt = file.name.split('.').pop();
    const randomId = Math.random().toString(36).substring(2);
    
    // Use a simple filename without any folders to avoid RLS issues
    const fileName = `${randomId}.${fileExt}`;
    
    setUploadLoading(true);
    setError(null);
    
    try {
      console.log('Starting file upload to Supabase storage...');
      console.log('File details:', { name: file.name, type: file.type, size: file.size });
      
      // First, ensure the bucket exists
      await ensureProfilePhotosBucket();
      
      // Try multiple upload paths if needed
      let uploadSuccess = false;
      let publicUrl = '';
      
      // Try different paths in order of preference
      const uploadPaths = [
        fileName,                     // Simple filename at root
        `public/${randomId}.${fileExt}`, // In public folder
        `uploads/${randomId}.${fileExt}` // In uploads folder
      ];
      
      for (const path of uploadPaths) {
        try {
          console.log(`Attempting upload to: ${path}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            console.error(`Upload error (${path}):`, uploadError);
            
            // Check if this is an RLS policy error
            if (uploadError.message && (
                uploadError.message.includes('row-level security') ||
                uploadError.message.includes('violates row-level security policy')
            )) {
              console.error('RLS policy error detected. Trying next path...');
              continue; // Try next path
            }
            
            throw uploadError;
          }
          
          console.log(`Upload successful to ${path}:`, uploadData);
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(path);
            
          publicUrl = urlData.publicUrl;
          uploadSuccess = true;
          break; // Exit the loop on success
        } catch (pathError) {
          console.error(`Error during upload to ${path}:`, pathError);
          // Continue to next path
        }
      }
      
      if (!uploadSuccess) {
        throw new Error('All upload attempts failed. The storage policies may not be properly configured.');
      }
      
      console.log('Public URL generated:', publicUrl);
      
      // Update avatar_url in formData
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Update profile in database
      const { data: profileData, error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userData.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }
      
      console.log('Profile updated successfully:', profileData);
      
      // Update local state
      setUserData({
        ...userData,
        avatar_url: publicUrl
      });
      
      setImageError(false);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      // Force a page reload to update the avatar in the header
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error('Error uploading file:', err);
      
      // Check if this is an RLS policy error
      if (err instanceof Error && 
          err.message && (
            err.message.includes('row-level security') ||
            err.message.includes('violates row-level security policy')
          )) {
        setError('Storage permission error. The administrator needs to configure the storage policies. Please contact support.');
      } else {
        setError(typeof err === 'object' && err !== null && 'message' in err 
          ? String((err as any).message) 
          : 'An error occurred while uploading your profile picture. Please try again later.');
      }
    } finally {
      setUploadLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    
    try {
      // Update user metadata (name)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: formData.name }
      });
      
      if (updateError) throw updateError;
      
      // Update profile data in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          name: formData.name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        });
        
      if (profileError) throw profileError;
      
      // Update local state
      setUserData({
        ...userData,
        ...formData
      });
      
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
      
      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 text-green-600 p-3 rounded-md">
          Your profile has been updated successfully.
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-1/3">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden bg-gray-100">
              {formData.avatar_url && !imageError ? (
                <Image 
                  src={formData.avatar_url} 
                  alt="Profile" 
                  fill 
                  className="object-cover"
                  onError={() => {
                    console.error('Image failed to load:', formData.avatar_url);
                    setImageError(true);
                  }}
                  unoptimized={true}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                  <span className="text-4xl">{userData.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition"
              disabled={uploadLoading}
            >
              {uploadLoading ? 'Uploading...' : 'Change Photo'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Max size: 5MB. Formats: JPEG, PNG, GIF, WebP
            </p>
          </div>
        </div>
        
        <div className="w-full md:w-2/3 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={userData.email}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              To change your email, go to the Security tab.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 