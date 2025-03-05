import { NextResponse } from 'next/server';

export function middleware(request) {
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/*',
}; 