/**
 * Authentication Error Handler Utility
 * Provides consistent 401 error handling with token refresh before redirect
 */

import AuthService from '../shared/lib/authService';

// Track whether a refresh is already in progress to avoid concurrent refreshes
let refreshInProgress: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the refresh_token cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  // If a refresh is already in flight, piggyback on it
  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.success && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        console.log('[AuthErrorHandler] Token refreshed successfully');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[AuthErrorHandler] Token refresh failed:', err);
      return false;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

// Track retry attempts to prevent infinite loops
const retryAttempts = new Map<string, number>();
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_RESET_TIME = 60000; // 1 minute

export interface RetryOptions {
  maxRetries?: number;
  retryKey?: string;
  onRetryExceeded?: () => void;
}

/**
 * Check if we should retry a failed request
 */
export function shouldRetry(key: string, maxRetries: number = MAX_RETRY_ATTEMPTS): boolean {
  const attempts = retryAttempts.get(key) || 0;
  return attempts < maxRetries;
}

/**
 * Increment retry count for a key
 */
export function incrementRetry(key: string): number {
  const attempts = (retryAttempts.get(key) || 0) + 1;
  retryAttempts.set(key, attempts);

  // Auto-reset after timeout
  setTimeout(() => {
    retryAttempts.delete(key);
  }, RETRY_RESET_TIME);

  return attempts;
}

/**
 * Reset retry count for a key
 */
export function resetRetry(key: string): void {
  retryAttempts.delete(key);
}

/**
 * Handle 401 authentication errors.
 * First attempts a token refresh; only redirects to login if refresh fails.
 */
export async function handle401Error(error: any, context: string = 'api'): Promise<never> {
  console.warn(`[AuthErrorHandler] 401 in ${context} — attempting token refresh`);

  // Try to refresh before giving up
  const refreshed = await tryRefreshToken();
  if (refreshed) {
    // Token was refreshed — the caller should retry the original request.
    // We still throw so the interceptor knows to retry.
    const retryError = new Error('Token refreshed — retry request');
    (retryError as any).tokenRefreshed = true;
    throw retryError;
  }

  // Refresh failed — session is truly expired
  console.warn(`[AuthErrorHandler] Refresh failed in ${context}, redirecting to login`);

  try {
    await AuthService.logout();
  } catch (logoutError) {
    console.error('Error during logout:', logoutError);
  }

  // Clear any stored authentication data
  localStorage.removeItem('auth_user');
  localStorage.removeItem('access_token');

  // Redirect to login page
  const currentPath = window.location.pathname;
  const loginUrl = `/auth/login${currentPath !== '/auth/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`;

  console.log(`[AuthErrorHandler] Redirecting to login: ${loginUrl}`);
  window.location.href = loginUrl;

  throw new Error('Authentication required - redirecting to login');
}

/**
 * Check if an error is a 401 authentication error
 */
export function is401Error(error: any): boolean {
  if (!error) return false;

  if (error.response?.status === 401) return true;
  if (error.status === 401) return true;
  if (error.message?.includes('401')) return true;
  if (error.message?.toLowerCase().includes('unauthorized')) return true;
  if (error.message?.toLowerCase().includes('authentication required')) return true;

  return false;
}

/**
 * Wrap an async function with retry logic and 401 handling
 */
export function withAuthRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  const { maxRetries = MAX_RETRY_ATTEMPTS, retryKey, onRetryExceeded } = options;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = retryKey || fn.name || 'anonymous';

    try {
      const result = await fn(...args);
      // Reset retry count on success
      resetRetry(key);
      return result;
    } catch (error) {
      // Check if it's a 401 error
      if (is401Error(error)) {
        await handle401Error(error, key);
        return; // Never reached due to redirect
      }

      // Check if we should retry
      if (shouldRetry(key, maxRetries)) {
        const attempts = incrementRetry(key);
        console.warn(`Retrying ${key} (attempt ${attempts}/${maxRetries}):`, error);

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));

        // Retry the function
        return withAuthRetry(fn, options)(...args);
      } else {
        console.error(`Max retries exceeded for ${key}:`, error);
        if (onRetryExceeded) {
          onRetryExceeded();
        }
        throw error;
      }
    }
  }) as T;
}

/**
 * Create a retry key based on function name and parameters
 */
export function createRetryKey(functionName: string, ...params: any[]): string {
  const paramString = params.map(p =>
    typeof p === 'object' ? JSON.stringify(p) : String(p)
  ).join('_');
  return `${functionName}_${paramString}`;
}
