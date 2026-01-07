// lib/env-validation.ts
/**
 * Centralized environment variable validation
 * Call this at application startup
 */

import { logger } from './logger';

interface EnvConfig {
    // Firebase Client
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    NEXT_PUBLIC_FIREBASE_APP_ID: string;

    // Firebase Admin
    FIREBASE_PROJECT_ID: string;
    FIREBASE_PRIVATE_KEY: string;
    FIREBASE_CLIENT_EMAIL: string;

    // Google Cloud / Vertex AI
    GOOGLE_CLOUD_PROJECT_ID: string;
    GOOGLE_CLOUD_LOCATION: string;
    GOOGLE_CLOUD_CLIENT_EMAIL: string;
    GOOGLE_CLOUD_PRIVATE_KEY: string;
}

const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
    // Firebase Client (optional for build-time)
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',

    // Firebase Admin (required for server)
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',

    // Vertex AI (required for server)
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_CLOUD_CLIENT_EMAIL',
    'GOOGLE_CLOUD_PRIVATE_KEY',
];

/**
 * Validate environment variables
 * @param strict - If true, throw error on missing vars. If false, only warn.
 */
export function validateEnvironment(strict: boolean = false): boolean {
    const missing: string[] = [];
    const invalid: Array<{ key: string; reason: string }> = [];

    for (const key of REQUIRED_ENV_VARS) {
        const value = process.env[key];

        if (!value) {
            missing.push(key);
            continue;
        }

        // Validate format for specific keys
        if (key === 'FIREBASE_PRIVATE_KEY' || key === 'GOOGLE_CLOUD_PRIVATE_KEY') {
            if (!value.includes('BEGIN PRIVATE KEY')) {
                invalid.push({
                    key,
                    reason: 'Must be a valid private key starting with "-----BEGIN PRIVATE KEY-----"',
                });
            }
        }

        if (key.includes('EMAIL')) {
            if (!value.includes('@')) {
                invalid.push({
                    key,
                    reason: 'Must be a valid email address',
                });
            }
        }

        if (key === 'GOOGLE_CLOUD_LOCATION') {
            // Common valid locations
            const validLocations = [
                'us-central1',
                'us-east1',
                'us-west1',
                'europe-west1',
                'asia-southeast1',
            ];

            if (!validLocations.includes(value)) {
                logger.warn(`Unusual Google Cloud location: ${value}. Common locations: ${validLocations.join(', ')}`);
            }
        }
    }

    // Report missing variables
    if (missing.length > 0) {
        const message = `Missing required environment variables:\n${missing.map(key => `  - ${key}`).join('\n')}`;

        if (strict) {
            logger.error(message);
            throw new Error(message);
        } else {
            logger.warn(message);
        }
    }

    // Report invalid variables
    if (invalid.length > 0) {
        const message = `Invalid environment variables:\n${invalid.map(item => `  - ${item.key}: ${item.reason}`).join('\n')}`;

        if (strict) {
            logger.error(message);
            throw new Error(message);
        } else {
            logger.warn(message);
        }
    }

    if (missing.length === 0 && invalid.length === 0) {
        logger.info('✅ All environment variables validated successfully');
        return true;
    }

    return false;
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: keyof EnvConfig, fallback?: string): string {
    const value = process.env[key];

    if (!value) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new Error(`Environment variable ${key} is not set and no fallback provided`);
    }

    return value;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Safe environment export for client-side
 */
export function getPublicEnv() {
    return {
        firebaseConfig: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        },
    };
}