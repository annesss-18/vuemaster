// lib/api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/auth.action';
import type { User } from '@/types';

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