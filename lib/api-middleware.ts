/**
 * API Middleware for Authentication
 * 
 * Provides reusable authentication wrapper for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/auth.action';

/**
 * Wraps an API route handler with authentication
 * 
 * @param handler - The API route handler that requires authentication
 * @returns Authenticated API route handler
 * 
 * @example
 * export const POST = withAuth(async (req, user) => {
 *   // user.id is guaranteed to be available
 *   const userId = user.id;
 *   // ... process request
 * });
 */
export function withAuth(
    handler: (req: NextRequest, user: User) => Promise<Response>
) {
    return async (req: NextRequest): Promise<Response> => {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
        }

        return handler(req, user);
    };
}
