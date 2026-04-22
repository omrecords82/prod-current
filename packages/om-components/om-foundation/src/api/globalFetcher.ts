/**
 * Global Fetcher for OrthodMetrics
 * Centralized data fetching utility with caching and error handling
 */

import { apiJson } from '@/shared/lib/apiClient';

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Global cache
const cache = new Map<string, CacheEntry<any>>();

// Default cache TTL (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache key generator
function generateCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

// Check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// Get data from cache
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  if (entry) {
    cache.delete(key); // Remove expired entry
  }
  return null;
}

// Set data in cache
function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Clear cache
export function clearCache(pattern?: string): void {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Get cache stats
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; age: number; ttl: number }>;
} {
  const now = Date.now();
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }))
  };
}

// Main fetcher function
export async function globalFetcher<T = any>(
  url: string,
  options: RequestInit & { 
    cache?: boolean | number; // true for default TTL, number for custom TTL in ms
    revalidate?: boolean; // force revalidation
  } = {}
): Promise<T> {
  const { cache: cacheOption = true, revalidate = false, ...fetchOptions } = options;
  
  // Generate cache key
  const cacheKey = generateCacheKey(url, fetchOptions);
  
  // Check cache first (only for GET requests and if caching is enabled)
  if (!revalidate && fetchOptions.method === 'GET' && cacheOption) {
    const cachedData = getFromCache<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  try {
    // Make the API call
    const data = await apiJson<T>(url, fetchOptions);
    
    // Cache the result if caching is enabled
    if (fetchOptions.method === 'GET' && cacheOption) {
      const ttl = typeof cacheOption === 'number' ? cacheOption : DEFAULT_TTL;
      setCache(cacheKey, data, ttl);
    }
    
    return data;
  } catch (error) {
    // Re-throw the error
    throw error;
  }
}

// Convenience methods
export const fetcher = {
  get: <T = any>(url: string, options?: RequestInit & { cache?: boolean | number; revalidate?: boolean }) =>
    globalFetcher<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, data?: any, options?: RequestInit) =>
    globalFetcher<T>(url, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    
  put: <T = any>(url: string, data?: any, options?: RequestInit) =>
    globalFetcher<T>(url, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
    
  patch: <T = any>(url: string, data?: any, options?: RequestInit) =>
    globalFetcher<T>(url, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    
  delete: <T = any>(url: string, options?: RequestInit) =>
    globalFetcher<T>(url, { ...options, method: 'DELETE' }),
};

// SWR-style fetcher for React Query or SWR
export const swrFetcher = <T = any>(url: string): Promise<T> => 
  globalFetcher<T>(url, { cache: true });

// Prefetch function
export async function prefetch<T = any>(
  url: string,
  options?: RequestInit & { ttl?: number }
): Promise<void> {
  try {
    await globalFetcher<T>(url, { ...options, cache: options?.ttl || DEFAULT_TTL });
  } catch (error) {
    // Silently fail for prefetch
    console.warn('Prefetch failed:', url, error);
  }
}

// Batch fetcher for multiple requests
export async function batchFetcher<T = any>(
  requests: Array<{
    url: string;
    options?: RequestInit & { cache?: boolean | number };
  }>
): Promise<T[]> {
  const promises = requests.map(({ url, options }) => 
    globalFetcher<T>(url, options)
  );
  
  return Promise.all(promises);
}

// Conditional fetcher (only fetch if condition is true)
export function conditionalFetcher<T = any>(
  condition: boolean,
  url: string,
  options?: RequestInit & { cache?: boolean | number }
): Promise<T | null> {
  if (!condition) {
    return Promise.resolve(null);
  }
  return globalFetcher<T>(url, options);
}

// Retry fetcher with exponential backoff
export async function retryFetcher<T = any>(
  url: string,
  options: RequestInit & { 
    cache?: boolean | number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await globalFetcher<T>(url, fetchOptions);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// SWR-compatible fetchers
export const getFetcher = (url: string) => globalFetcher(url, { method: 'GET' });
export const postFetcher = (url: string, data: any) => globalFetcher(url, { 
  method: 'POST', 
  body: JSON.stringify(data) 
});
export const putFetcher = (url: string, data: any) => globalFetcher(url, { 
  method: 'PUT', 
  body: JSON.stringify(data) 
});
export const deleteFetcher = (url: string) => globalFetcher(url, { method: 'DELETE' });
export const patchFetcher = (url: string, data: any) => globalFetcher(url, {
  method: 'PATCH',
  body: JSON.stringify(data)
});

// Export default
export default globalFetcher;
