import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Proxy for global request handling
 * 
 * This proxy runs on every request and can be used for:
 * - Rate limiting at the edge
 * - Bot detection
 * - Geolocation-based routing
 * - A/B testing
 * 
 * Note: Authentication is handled via cookies in server components/actions.
 */
export function proxy(request: NextRequest) {
    const response = NextResponse.next();

    // Add request ID for tracing (useful for debugging)
    const requestId = crypto.randomUUID();
    response.headers.set('X-Request-Id', requestId);

    // Add security headers that require runtime values
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // Content Security Policy
    // Note: 'unsafe-inline' and 'unsafe-eval' are needed for Next.js in development
    // For stricter CSP, consider using nonces for scripts
    const cspHeader = process.env.NODE_ENV === 'production'
        ? `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https: http:;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.googleapis.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com wss://*.googleapis.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com https://va.vercel-scripts.com;
        frame-ancestors 'none';
        form-action 'self';
        base-uri 'self';
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()
        : ''; // Skip CSP in development for easier debugging

    if (cspHeader) {
        response.headers.set('Content-Security-Policy', cspHeader);
    }

    return response;
}

// Configure which routes the proxy runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
