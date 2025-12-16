/**
 * Caching utilities for improving performance
 * Provides in-memory and localStorage caching strategies
 */

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

class CacheManager {
  private memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

  /**
   * Get value from cache (memory first, then localStorage)
   */
  get<T>(key: string): T | null {
    // Check memory cache
    const cached = this.memoryCache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value as T;
      }
      this.memoryCache.delete(key);
    }

    // Check localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.expiresAt > Date.now()) {
            return parsed.value;
          }
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }
    }

    return null;
  }

  /**
   * Set value in cache (memory + localStorage)
   */
  set<T>(key: string, value: T, ttl: number = 1000 * 60 * 60): void {
    const expiresAt = Date.now() + ttl;

    // Store in memory
    this.memoryCache.set(key, { value, expiresAt });

    // Store in localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ value, expiresAt })
        );
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  }

  /**
   * Clear specific cache key
   */
  clear(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Memoized async function wrapper with caching
 * Usage:
 *   const cachedFetch = memoizeAsync(fetchData, { key: 'myData', ttl: 60000 });
 *   const result = await cachedFetch();
 */
export function memoizeAsync<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: CacheOptions
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const cacheKey = `${options.key}:${JSON.stringify(args)}`;
    const cached = cacheManager.get<T>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    try {
      const result = await fn(...args);
      cacheManager.set(cacheKey, result, options.ttl);
      return result;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Cache key constants to avoid magic strings
 */
export const CACHE_KEYS = {
  TECH_LOGOS: 'tech-logos',
  USER_PROFILE: 'user-profile',
  INTERVIEWS: 'interviews',
  FEEDBACK: 'feedback'
} as const;

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 1000 * 5,           // 5 seconds
  MEDIUM: 1000 * 60,         // 1 minute
  LONG: 1000 * 60 * 60,      // 1 hour
  VERY_LONG: 1000 * 60 * 60 * 24  // 1 day
} as const;
