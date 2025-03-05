'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface SecurityFormProps {
  userData: any;
}

export default function SecurityForm({ userData }: SecurityFormProps) {
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: '',
  });
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }
    
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while updating your password');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailSuccess(false);
    setEmailError(null);
    
    try {
      // Update email
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });
      
      if (error) throw error;
      
      setEmailSuccess(true);
      setEmailData({
        newEmail: '',
        password: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setEmailSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating email:', err);
      setEmailError(typeof err === 'object' && err !== null && 'message' in err 
        ? String(err.message) 
        : 'An error occurred while updating your email');
    } finally {
      setEmailLoading(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        
        {passwordError && (
          <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4">
            {passwordError}
          </div>
        )}
        
        {passwordSuccess && (
          <div className="bg-green-100 text-green-600 p-3 rounded-md mb-4">
            Your password has been updated successfully.
          </div>
        )}
        
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Change Email Address</h2>
        
        {emailError && (
          <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4">
            {emailError}
          </div>
        )}
        
        {emailSuccess && (
          <div className="bg-green-100 text-green-600 p-3 rounded-md mb-4">
            A confirmation email has been sent to your new email address. Please check your inbox.
          </div>
        )}
        
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentEmail">
              Current Email
            </label>
            <input
              id="currentEmail"
              type="email"
              value={userData.email}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newEmail">
              New Email
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              value={emailData.newEmail}
              onChange={handleEmailChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Current Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={emailData.password}
              onChange={handleEmailChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              disabled={emailLoading}
            >
              {emailLoading ? 'Updating...' : 'Update Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 