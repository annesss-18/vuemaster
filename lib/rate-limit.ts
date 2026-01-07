// lib/rate-limit.ts
/**
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis or a dedicated service
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (entry.resetTime < now) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    windowMs?: number; // Time window in milliseconds
    maxRequests?: number; // Max requests per window
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; resetTime: number } {
    const windowMs = config.windowMs || 60 * 1000; // Default: 1 minute
    const maxRequests = config.maxRequests || 10; // Default: 10 requests

    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    // No previous entry or window expired
    if (!entry || entry.resetTime < now) {
        const resetTime = now + windowMs;
        rateLimitMap.set(identifier, {
            count: 1,
            resetTime,
        });

        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime,
        };
    }

    // Within current window
    if (entry.count < maxRequests) {
        entry.count++;
        rateLimitMap.set(identifier, entry);

        return {
            allowed: true,
            remaining: maxRequests - entry.count,
            resetTime: entry.resetTime,
        };
    }

    // Rate limit exceeded
    return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
    };
}

/**
 * Clear rate limit for an identifier (useful for testing)
 */
export function clearRateLimit(identifier: string): void {
    rateLimitMap.delete(identifier);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(identifier: string): {
    count: number;
    remaining: number;
    resetTime: number;
} | null {
    const entry = rateLimitMap.get(identifier);

    if (!entry) {
        return null;
    }

    const now = Date.now();
    if (entry.resetTime < now) {
        return null;
    }

    return {
        count: entry.count,
        remaining: Math.max(0, 10 - entry.count),
        resetTime: entry.resetTime,
    };
}