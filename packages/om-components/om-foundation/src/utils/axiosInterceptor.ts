/**
 * Global Axios Interceptor for 401 Error Handling
 * Sets up consistent authentication error handling across all axios requests
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { handle401Error, is401Error } from './authErrorHandler';

// Track if interceptor is already set up to prevent multiple setups
let interceptorSetup = false;

/**
 * Set up global axios interceptors
 */
export function setupAxiosInterceptors(): void {
  if (interceptorSetup) {
    console.log('🔗 Axios interceptors already set up');
    return;
  }

  console.log('🔗 Setting up global axios interceptors...');

  // Request interceptor - ensure credentials are included
  axios.interceptors.request.use(
    (config) => {
      // Ensure credentials are always included for session-based auth
      config.withCredentials = true;
      
      // Add timestamp to prevent caching issues
      if (config.method === 'get') {
        const separator = config.url?.includes('?') ? '&' : '?';
        config.url += `${separator}_t=${Date.now()}`;
      }
      
      return config;
    },
    (error) => {
      console.error('🔗 Axios request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle 401 errors globally
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      // Success response - just return it
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      // Check if it's a 401 error
      if (is401Error(error)) {
        console.warn('🔒 Global axios interceptor caught 401 error:', error);
        
        // Prevent infinite redirects on login page
        if (window.location.pathname.includes('/auth/sign-in')) {
          console.log('🔒 Already on login page, not redirecting');
          return Promise.reject(error);
        }
        
        // Mark request to prevent retry loops
        if ((originalRequest as any)._retry) {
          console.warn('🔒 Request already retried, handling 401 error');
          await handle401Error(error, 'axios_interceptor');
          return Promise.reject(error);
        }
        
        (originalRequest as any)._retry = true;
        
        // Handle the 401 error (will redirect to login)
        await handle401Error(error, 'axios_interceptor');
        
        // This line won't be reached due to redirect, but added for completeness
        return Promise.reject(error);
      }
      
      // For other errors, just reject normally
      console.error('🔗 Axios response error:', error);
      return Promise.reject(error);
    }
  );

  interceptorSetup = true;
  console.log('✅ Global axios interceptors set up successfully');
}

/**
 * Remove axios interceptors (for cleanup)
 */
export function removeAxiosInterceptors(): void {
  axios.interceptors.request.clear();
  axios.interceptors.response.clear();
  interceptorSetup = false;
  console.log('🔗 Axios interceptors removed');
}

/**
 * Check if interceptors are set up
 */
export function areInterceptorsSetup(): boolean {
  return interceptorSetup;
} 