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
    storage: {
      getItem: (key) => {
        if (typeof document === 'undefined') {
          return null;
        }
        
        const value = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${key}=`))
          ?.split('=')[1];
          
        return value ? value : null;
      },
      setItem: (key, value) => {
        if (typeof document !== 'undefined') {
          document.cookie = `${key}=${value}; path=/; max-age=2592000`; // 30 days
        }
      },
      removeItem: (key) => {
        if (typeof document !== 'undefined') {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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