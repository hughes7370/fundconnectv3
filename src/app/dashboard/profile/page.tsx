'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabase';
import ProfileTabs from './ProfileTabs';
import PersonalInfoForm from './PersonalInfoForm';
import SecurityForm from './SecurityForm';
import ProfessionalInfoForm from './ProfessionalInfoForm';
import PreferencesForm from './PreferencesForm';
import StorageTest from './StorageTest';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [showStorageTest, setShowStorageTest] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const getUserProfile = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
        
        // Combine auth data with profile data
        setUserData({
          id: session.user.id,
          email: session.user.email,
          ...session.user.user_metadata,
          ...profile
        });
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getUserProfile();
  }, [router]);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const renderTabContent = () => {
    if (!userData) return null;
    
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoForm userData={userData} setUserData={setUserData} />;
      case 'security':
        return <SecurityForm userData={userData} />;
      case 'professional':
        return <ProfessionalInfoForm userData={userData} setUserData={setUserData} />;
      case 'preferences':
        return <PreferencesForm userData={userData} setUserData={setUserData} />;
      default:
        return <PersonalInfoForm userData={userData} setUserData={setUserData} />;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <button
            onClick={() => setShowStorageTest(!showStorageTest)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showStorageTest ? 'Hide Storage Test' : 'Show Storage Test'}
          </button>
        </div>
        
        {showStorageTest && <StorageTest />}
        
        {loading ? (
          <div className="flex flex-col space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              {renderTabContent()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 