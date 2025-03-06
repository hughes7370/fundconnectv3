import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  try {
    // Create a Supabase client
    const supabase = createMiddlewareClient({ req, res });
    
    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession();
    
    // Log session status (for debugging)
    console.log('Middleware session check:', session ? 'Session exists' : 'No session');
  } catch (error) {
    console.error('Middleware error:', error);
  }
  
  return res;
}

// Specify which routes this middleware applies to
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}; 