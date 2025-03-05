'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface ProfessionalInfoFormProps {
  userData: any;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
}

export default function ProfessionalInfoForm({ userData, setUserData }: ProfessionalInfoFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company: userData.company || '',
    title: userData.title || '',
    bio: userData.bio || '',
    years_experience: userData.years_experience || '',
    certifications: userData.certifications || '',
    linkedin_url: userData.linkedin_url || '',
    website_url: userData.website_url || '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          company: formData.company,
          title: formData.title,
          bio: formData.bio,
          years_experience: formData.years_experience,
          certifications: formData.certifications,
          linkedin_url: formData.linkedin_url,
          website_url: formData.website_url,
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
      console.error('Error updating professional info:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while updating your professional information');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Professional Information</h2>
      
      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 text-green-600 p-3 rounded-md">
          Your professional information has been updated successfully.
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="company">
            Company/Firm
          </label>
          <input
            id="company"
            name="company"
            type="text"
            value={formData.company}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
            Professional Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bio">
            Professional Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={formData.bio}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Tell investors about your professional background and expertise..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="years_experience">
            Years of Experience
          </label>
          <input
            id="years_experience"
            name="years_experience"
            type="number"
            min="0"
            value={formData.years_experience}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="certifications">
            Certifications/Credentials
          </label>
          <input
            id="certifications"
            name="certifications"
            type="text"
            value={formData.certifications}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="CFA, CFP, etc."
          />
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Professional Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="linkedin_url">
              LinkedIn Profile
            </label>
            <input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="website_url">
              Personal/Company Website
            </label>
            <input
              id="website_url"
              name="website_url"
              type="url"
              value={formData.website_url}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="https://example.com"
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