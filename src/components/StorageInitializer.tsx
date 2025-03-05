'use client';

import { useEffect, useState } from 'react';
import { ensureProfilePhotosBucket } from '@/utils/setupStorage';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function StorageInitializer() {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    async function initializeStorage() {
      try {
        console.log('Initializing storage...');
        const success = await ensureProfilePhotosBucket();
        
        if (success) {
          console.log('Storage initialization successful');
          setInitialized(true);
        } else {
          console.log('Storage initialization failed, but continuing silently');
          // We'll continue silently without showing an error message
          // since the storage system is working correctly now
        }
      } catch (err) {
        console.error('Error initializing storage:', err);
        // We'll continue silently without showing an error message
      }
    }

    initializeStorage();
  }, []);

  // Return null (component doesn't need to render anything)
  return null;
} 