import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set up in your .env.local file
// and in Vercel for production deployment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create Supabase client with cookie storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        if (typeof document === 'undefined') {
          console.log('getItem: Document is undefined (server-side)');
          return null;
        }
        
        try {
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
            ?.split('=')[1];
            
          console.log(`getItem: Retrieved ${key} from cookies:`, value ? 'found' : 'not found');
          return value ? decodeURIComponent(value) : null;
        } catch (error) {
          console.error('Error getting cookie:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        if (typeof document !== 'undefined') {
          try {
            const encodedValue = encodeURIComponent(value);
            document.cookie = `${key}=${encodedValue}; path=/; max-age=2592000; SameSite=Lax`; // 30 days
            console.log(`setItem: Set ${key} in cookies`);
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        } else {
          console.log('setItem: Document is undefined (server-side)');
        }
      },
      removeItem: (key) => {
        if (typeof document !== 'undefined') {
          try {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
            console.log(`removeItem: Removed ${key} from cookies`);
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        } else {
          console.log('removeItem: Document is undefined (server-side)');
        }
      },
    },
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'agent' | 'investor' | 'admin';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'agent' | 'investor' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'agent' | 'investor' | 'admin';
          created_at?: string;
        };
      };
      agents: {
        Row: {
          user_id: string;
          name: string;
          firm: string;
          broker_dealer_verified: boolean;
        };
        Insert: {
          user_id: string;
          name: string;
          firm: string;
          broker_dealer_verified?: boolean;
        };
        Update: {
          user_id?: string;
          name?: string;
          firm?: string;
          broker_dealer_verified?: boolean;
        };
      };
      investors: {
        Row: {
          user_id: string;
          name: string;
          introducing_agent_id: string | null;
          approved: boolean;
        };
        Insert: {
          user_id: string;
          name: string;
          introducing_agent_id?: string | null;
          approved?: boolean;
        };
        Update: {
          user_id?: string;
          name?: string;
          introducing_agent_id?: string | null;
          approved?: boolean;
        };
      };
      funds: {
        Row: {
          id: string;
          name: string;
          size: number;
          minimum_investment: number;
          strategy: string;
          sector_focus: string;
          geography: string;
          track_record_irr: number | null;
          track_record_moic: number | null;
          team_background: string;
          management_fee: number;
          carry: number;
          uploaded_by_agent_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          size: number;
          minimum_investment: number;
          strategy: string;
          sector_focus: string;
          geography: string;
          track_record_irr?: number | null;
          track_record_moic?: number | null;
          team_background: string;
          management_fee: number;
          carry: number;
          uploaded_by_agent_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          size?: number;
          minimum_investment?: number;
          strategy?: string;
          sector_focus?: string;
          geography?: string;
          track_record_irr?: number | null;
          track_record_moic?: number | null;
          team_background?: string;
          management_fee?: number;
          carry?: number;
          uploaded_by_agent_id?: string;
          created_at?: string;
        };
      };
      // Add remaining table types here following the same pattern
    };
  };
}; 