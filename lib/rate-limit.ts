// lib/rate-limit.ts
/**
 * Simple in-memory rate limiting for API routes
 * 
 * ⚠️ PRODUCTION NOTE: This in-memory implementation does NOT work across 
 * multiple serverless instances. For production deployments with horizontal 
 * scaling, use Redis, Upstash, or a dedicated rate limiting service.
 * 
 * Example with Upstash:
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(10, "60 s"),
 * });
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Default configuration constants
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10;

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
    const windowMs = config.windowMs || DEFAULT_WINDOW_MS;
    const maxRequests = config.maxRequests || DEFAULT_MAX_REQUESTS;

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
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param maxRequests - Max requests to calculate remaining (defaults to DEFAULT_MAX_REQUESTS)
 */
export function getRateLimitStatus(
    identifier: string,
    maxRequests: number = DEFAULT_MAX_REQUESTS
): {
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
        remaining: Math.max(0, maxRequests - entry.count),
        resetTime: entry.resetTime,
    };
}