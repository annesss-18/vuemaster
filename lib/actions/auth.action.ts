'use server';

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";
import { logger } from "../logger";

const SESSION_EXPIRY = 60 * 60 * 24 * 7; // Session expires after 7 days

export async function signUp(params: SignUpParams) {
    const { uid, name, email } = params;

    try {
        const userRecord = await db.collection('users').doc(uid).get();
        if (userRecord.exists) {
            return {
                success: false,
                message: 'User already exists. Please sign in instead.'
            };
        }
        await db.collection('users').doc(uid).set({
            name, email
        })

        return {
            success: true,
            message: 'Account created successfully'
        }

    }
    catch (e: unknown) {
        logger.error('Error signing up user:', e);
        const err = e as { code?: string } | undefined;
        if (err?.code === 'auth/email-already-exists') {
            return {
                success: false,
                message: 'Email already in use'
            };
        }
        return {
            success: false,
            message: 'Failed to create account'
        }
    }
}

export async function signIn(params: SignInParams) {
    const { email, idToken } = params;

    try {
        // This will throw if user doesn't exist
        await auth.getUserByEmail(email);

        // Set session cookie
        await setSessionCookie(idToken);

        return {
            success: true,
            message: 'Signed in successfully'
        };
    }
    catch (e: unknown) {
        logger.error('Error signing in user:', e);
        const err = e as { code?: string };

        // Provide specific error messages
        if (err?.code === 'auth/user-not-found') {
            return {
                success: false,
                message: 'User not found. Please sign up first.'
            };
        }

        return {
            success: false,
            message: 'Failed to sign in. Please try again.'
        }
    }
}

export async function setSessionCookie(idToken: string) {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production';
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRY * 1000 })

    cookieStore.set('session', sessionCookie, {
        maxAge: SESSION_EXPIRY,
        httpOnly: true,
        secure: isProduction,
        path: '/',
        sameSite: 'lax'
    })
}

export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
        return null;
    }
    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const userRecord = await db.collection('users').doc(decodedClaims.uid).get();

        if (!userRecord.exists) {
            return null;
        }

        const userData = userRecord.data() as User;

        return {
            ...userData,
            id: decodedClaims.uid
        } as User;
    }

    catch (e: unknown) {
        logger.error('Error verifying session cookie:', e);
        return null;
    }
}

export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}

