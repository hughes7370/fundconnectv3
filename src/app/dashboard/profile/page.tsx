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
          console.log('No session found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        console.log('Session found, user ID:', session.user.id);
        console.log('User metadata:', session.user.user_metadata);
        
        // Check if profiles table exists by trying to select from it
        try {
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              console.log('Profile not found, will create one');
              
              // Try to create a profile
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert([{ 
                  id: session.user.id,
                  name: session.user.user_metadata?.name || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }])
                .select();
                
              if (insertError) {
                console.error('Error creating profile:', insertError);
                throw insertError;
              }
              
              console.log('Created new profile:', newProfile);
              
              // Combine auth data with new profile data
              setUserData({
                id: session.user.id,
                email: session.user.email,
                ...session.user.user_metadata,
                ...newProfile[0]
              });
            } else {
              console.error('Error fetching profile:', profileError);
              throw profileError;
            }
          } else {
            console.log('Profile found:', profile);
            
            // Combine auth data with profile data
            setUserData({
              id: session.user.id,
              email: session.user.email,
              ...session.user.user_metadata,
              ...profile
            });
          }
        } catch (tableError) {
          console.error('Error with profiles table:', tableError);
          
          // If the profiles table doesn't exist, just use the auth data
          setUserData({
            id: session.user.id,
            email: session.user.email,
            ...session.user.user_metadata
          });
          
          // Try to create the profiles table
          try {
            console.log('Attempting to create profiles table...');
            
            // Execute the migration SQL
            const { error } = await supabase.rpc('create_profiles_table');
            
            if (error) {
              console.error('Error creating profiles table:', error);
            } else {
              console.log('Profiles table created successfully');
              
              // Try to create a profile for the user
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ 
                  id: session.user.id,
                  name: session.user.user_metadata?.name || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]);
                
              if (insertError) {
                console.error('Error creating profile after table creation:', insertError);
              } else {
                console.log('Profile created successfully after table creation');
              }
            }
          } catch (createTableError) {
            console.error('Error creating profiles table:', createTableError);
          }
        }
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