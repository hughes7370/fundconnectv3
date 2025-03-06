'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import StorageInitializer from '@/components/StorageInitializer';
import MessageNotification from '@/components/MessageNotification';
import Image from 'next/image';

interface DashboardLayoutProps {
  children: ReactNode;
}

type UserRole = 'agent' | 'investor' | 'admin' | null;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      // Get user role from session
      const role = session.user.user_metadata?.role as UserRole;
      const name = session.user.user_metadata?.name as string;
      
      setUserRole(role);
      setUserName(name);
      setUserId(session.user.id);
      
      // Try to get profile data including avatar
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();
          
        if (!error && profile && profile.avatar_url) {
          console.log('Found profile avatar:', profile.avatar_url);
          setUserAvatar(profile.avatar_url);
        } else if (error) {
          console.warn('Error fetching profile:', error.message);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    getUserData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Define navigation based on user role
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: pathname === '/dashboard' || false, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ) },
  ];

  // Add role-specific navigation items
  if (userRole === 'agent') {
    navigation.push(
      { name: 'My Funds', href: '/agent/funds', current: pathname?.startsWith('/agent/funds') || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) },
      { name: 'My Investors', href: '/agent/investors', current: pathname?.startsWith('/agent/investors') || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) },
    );
  } else if (userRole === 'investor') {
    navigation.push(
      { name: 'Find Funds', href: '/investor/funds', current: pathname?.startsWith('/investor/funds') || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ) },
      { name: 'My Interests', href: '/investor/interests', current: pathname === '/investor/interests' || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ) },
      { name: 'Saved Searches', href: '/investor/saved-searches', current: pathname === '/investor/saved-searches' || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) },
    );
  } else if (userRole === 'admin') {
    navigation.push(
      { name: 'Users', href: '/admin/users', current: pathname?.startsWith('/admin/users') || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) },
      { name: 'Funds', href: '/admin/funds', current: pathname?.startsWith('/admin/funds') || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) },
      { name: 'Approval Requests', href: '/admin/approvals', current: pathname === '/admin/approvals' || false, icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) },
    );
  }

  // Helper function to render avatar
  const renderAvatar = (size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
    
    if (userAvatar && !imageError) {
      return (
        <div className={`${sizeClass} rounded-full overflow-hidden relative`}>
          <Image 
            src={userAvatar} 
            alt={userName || 'User'} 
            fill 
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized={true}
          />
        </div>
      );
    }
    
    return (
      <div className={`${sizeClass} rounded-full bg-secondary flex items-center justify-center text-white shadow-sm`}>
        {userName ? userName.charAt(0).toUpperCase() : 'U'}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StorageInitializer />
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-primary shadow-xl">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center justify-center px-4 mb-5">
              <Link href="/dashboard" className="flex items-center">
                <div className="bg-white h-10 px-4 flex items-center justify-center rounded-md font-bold shadow-sm">
                  <span className="text-primary">Fund <span className="text-secondary">Connect</span></span>
                </div>
              </Link>
            </div>
            
            <div className="mt-1 px-3">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all
                      ${item.current
                        ? 'bg-primary-dark text-white shadow-sm'
                        : 'text-white/80 hover:bg-primary-light hover:text-white'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 p-4 border-t border-primary-dark">
            <div className="group block w-full flex-shrink-0">
              <div className="flex items-center">
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-white hover:text-gray-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className={`fixed inset-0 z-40 flex ${isMenuOpen ? 'visible' : 'invisible'}`}>
          <div
            className={`fixed inset-0 bg-gray-dark bg-opacity-75 transition-opacity ease-in-out duration-300 ${
              isMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsMenuOpen(false)}
          ></div>

          <div
            className={`relative flex w-full max-w-xs flex-1 flex-col bg-primary pt-5 pb-4 transform transition ease-in-out duration-300 shadow-xl ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-shrink-0 items-center justify-center px-4 mb-5">
              <div className="bg-secondary h-10 px-4 flex items-center justify-center rounded-md text-white font-semibold shadow-sm">
                Fund Connect
              </div>
            </div>
            
            <div className="mt-1 px-3 overflow-y-auto">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all
                      ${item.current
                        ? 'bg-primary-dark text-white shadow-sm'
                        : 'text-white/80 hover:bg-primary-light hover:text-white'
                      }
                    `}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-10 bg-white md:hidden shadow-sm">
        <div className="flex h-16 items-center justify-between border-b border-gray-light px-4">
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-dark hover:bg-gray-light hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setIsMenuOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="ml-4">
              <div className="bg-secondary h-8 px-3 flex items-center justify-center rounded-md text-white font-semibold text-sm shadow-sm">
                Fund Connect
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {/* Message Notification for Mobile */}
            {userId && userRole && userRole !== 'admin' && (
              <MessageNotification 
                userId={userId} 
                userRole={userRole === 'investor' ? 'investor' : 'agent'} 
              />
            )}
            <div className="relative ml-3">
              <div>
                <button
                  type="button"
                  className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  {renderAvatar('sm')}
                </button>
              </div>
              {isProfileDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    <div>{userName || 'User'}</div>
                    <div className="capitalize">{userRole || 'loading...'}</div>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-end bg-white border-b border-gray-200 p-4 shadow-sm">
            {/* Message Notification for Desktop */}
            {userId && userRole && userRole !== 'admin' && (
              <div className="mr-4">
                <MessageNotification 
                  userId={userId} 
                  userRole={userRole === 'investor' ? 'investor' : 'agent'} 
                />
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-3 focus:outline-none"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <span className="text-sm text-gray-700">{userName || 'User'}</span>
                {renderAvatar('sm')}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isProfileDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    <div>{userName || 'User'}</div>
                    <div className="capitalize">{userRole || 'loading...'}</div>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="py-6 px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 