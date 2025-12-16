/**
 * API client wrapper with request/response handling
 * Provides centralized API calls with error handling, retries, and caching
 */

import { APIError } from '@/lib/error-handling';
import { cacheManager, CACHE_TTL } from '@/lib/cache';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  retry?: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Main API client with built-in error handling and caching
 */
class APIClient {
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultRetry: number = 3;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Perform an API request with error handling and retries
   */
  async request<T = any>(
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      cache = method === 'GET',
      cacheTTL = CACHE_TTL.MEDIUM,
      retry = this.defaultRetry
    } = config;

    // Generate cache key
    const cacheKey = `api:${method}:${url}:${JSON.stringify(body)}`;

    // Check cache
    if (cache && method === 'GET') {
      const cached = cacheManager.get<T>(cacheKey);
      if (cached) {
        console.debug('Cache hit:', cacheKey);
        return cached;
      }
    }

    // Attempt request with retries
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const response = await this.performRequest<T>(
          url,
          method,
          headers,
          body,
          timeout
        );

        // Cache successful response
        if (cache && method === 'GET') {
          cacheManager.set(cacheKey, response, cacheTTL);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof APIError) {
          if (error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retry - 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fullURL = this.baseURL + url;
      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: controller.signal
      };

      if (body && method !== 'GET') {
        requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(fullURL, requestInit);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          response.status,
          errorData.code || 'unknown_error',
          errorData.message || `HTTP ${response.status}`
        );
      }

      const data = await response.json() as APIResponse<T>;

      if (!data.success && data.error) {
        throw new APIError(400, data.code || 'api_error', data.error);
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET request
   */
  get<T = any>(url: string, config?: RequestConfig) {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  post<T = any>(url: string, body?: any, config?: RequestConfig) {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  put<T = any>(url: string, body?: any, config?: RequestConfig) {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  delete<T = any>(url: string, config?: RequestConfig) {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * Clear cache for a specific URL or all cache
   */
  clearCache(url?: string) {
    if (url) {
      cacheManager.clear(`api:${url}`);
    } else {
      cacheManager.clearAll();
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient(process.env.NEXT_PUBLIC_API_URL || '');

// Export class for custom instances
export default APIClient;
