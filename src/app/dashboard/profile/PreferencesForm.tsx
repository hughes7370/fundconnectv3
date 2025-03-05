'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface PreferencesFormProps {
  userData: any;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
}

export default function PreferencesForm({ userData, setUserData }: PreferencesFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email_notifications: userData.email_notifications !== false,
    marketing_emails: userData.marketing_emails !== false,
    profile_visibility: userData.profile_visibility || 'private',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    
    try {
      // Update profile data in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          email_notifications: formData.email_notifications,
          marketing_emails: formData.marketing_emails,
          profile_visibility: formData.profile_visibility,
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
      console.error('Error updating preferences:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while updating your preferences');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Preferences</h2>
      
      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 text-green-600 p-3 rounded-md">
          Your preferences have been updated successfully.
        </div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        
        <div className="flex items-center">
          <input
            id="email_notifications"
            name="email_notifications"
            type="checkbox"
            checked={formData.email_notifications}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-700">
            Receive email notifications about investor activity
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            id="marketing_emails"
            name="marketing_emails"
            type="checkbox"
            checked={formData.marketing_emails}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="marketing_emails" className="ml-2 block text-sm text-gray-700">
            Receive marketing emails and newsletters
          </label>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Profile Visibility</h3>
        
        <div>
          <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-1">
            Who can see your profile
          </label>
          <select
            id="profile_visibility"
            name="profile_visibility"
            value={formData.profile_visibility}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="private">Private - Only investors you've invited</option>
            <option value="platform">Platform - All registered investors</option>
            <option value="public">Public - Anyone with the link</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
} 