
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const isDashboardPath = path.startsWith('/dashboard') || 
                            path.startsWith('/clients') ||
                            path.startsWith('/drivers') ||
                            path.startsWith('/earnings') ||
                            path.startsWith('/payouts') ||
                            path.startsWith('/reservations') ||
                            path.startsWith('/settings') ||
                            path.startsWith('/tiers') ||
                            path.startsWith('/zones');

    const loginUrl = new URL('/login', request.url)

    // Using a placeholder for session check. 
    // In a real app, you'd verify a JWT or session cookie here.
    const hasSession = request.cookies.has('firebase-auth-cookie'); 

    if (isDashboardPath && !hasSession) {
        return NextResponse.redirect(loginUrl);
    }
    
    // Allow requests to /login and other pages to pass through
    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clients/:path*',
    '/drivers/:path*',
    '/earnings/:path*',
    '/payouts/:path*',
    '/reservations/:path*',
    '/settings/:path*',
    '/tiers/:path*',
    '/zones/:path*',
    '/login',
  ],
}
