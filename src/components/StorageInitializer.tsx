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
        // Attempt to initialize storage but don't block the app if it fails
        await ensureProfilePhotosBucket();
        
        // Always mark as initialized to avoid blocking the app
        setInitialized(true);
      } catch (err) {
        // Silently continue if there's an error
        console.log('Storage initialization encountered an error, but continuing silently');
        setInitialized(true);
      }
    }

    initializeStorage();
  }, []);

  // Return null (component doesn't need to render anything)
  return null;
} 