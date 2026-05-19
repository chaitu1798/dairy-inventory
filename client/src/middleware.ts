import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Requirement #1 & #2: Create a middleware to protect the dashboard and other private routes.
 * If no valid session cookie exists, redirect immediately to /login.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Define public routes that don't require authentication
    const isPublicRoute = 
        pathname === '/login' || 
        pathname === '/signup' || 
        pathname.startsWith('/_next') || 
        pathname.includes('/favicon.ico');

    // Get the session cookie we set in AuthContext/LoginPage
    const sessionToken = request.cookies.get('dairy_session')?.value;

    // If it's a private route and no session token is present, redirect to login
    if (!isPublicRoute && !sessionToken) {
        const loginUrl = new URL('/login', request.url);
        // Optionally pass the original destination to redirect back after login
        // loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If it's an auth route (login/signup) and a session token is present, redirect to dashboard
    if (isAuthRoute(pathname) && sessionToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

function isAuthRoute(pathname: string) {
    return pathname === '/login' || pathname === '/signup';
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
