/**
 * Shared Axios Instance for OrthodMetrics API
 * Provides unified error handling, baseURL, and interceptors
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../../config/api.config';
import { handle401Error } from '../../utils/authErrorHandler';

// ===== API CLIENT CONFIGURATION =====
// Use centralized configuration
const API_BASE_URL = API_CONFIG.BASE_URL;
const API_TIMEOUT = API_CONFIG.TIMEOUT;

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    console.log(`🔧 Initializing API Client with baseURL: "${API_BASE_URL}"`);
    console.log(`🌐 Environment: DEV=${import.meta.env.DEV}, PROD=${import.meta.env.PROD}`);

    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      withCredentials: true, // Session-based authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add /api prefix if not already present
        if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
          config.url = `/api${config.url}`;
        }

        // Add JWT token if available (for API authentication)
        // Skip for auth endpoints
        const isAuthEndpoint = config.url?.includes('/auth/') || config.url?.includes('/api/auth');
        if (!isAuthEndpoint && typeof window !== 'undefined') {
          const accessToken = localStorage.getItem('access_token');
          if (accessToken && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
          }
        }

        // Remove any invalid church_id headers for routes that don't need them
        // Routes that should NOT have church_id headers:
        // - /api/my/churches (user's own churches)
        // - /api/churches (global list, admin only)
        // - /api/auth/* (authentication endpoints)
        const url = config.url || '';
        const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url;
        const routesWithoutChurchId = [
          '/api/my/churches',
          '/api/churches',
          '/api/auth/',
          '/auth/',
          'my/churches',
          'churches', // Only match exact 'churches' not 'church/46/...'
        ];
        
        // Check if this is a route that shouldn't have church_id
        // Match both path-only and full URLs
        const shouldSkipChurchId = routesWithoutChurchId.some(route => {
          if (route === 'churches') {
            // Exact match for 'churches' endpoint (not church/46/...)
            return url === '/api/churches' || url === '/churches' || fullUrl.includes('/api/churches') || fullUrl.includes('/churches');
          }
          return url.includes(route) || fullUrl.includes(route);
        });
        
        // Check for invalid church_id header values (empty, "none", "undefined") on ALL routes
        // These invalid values can cause backend validation errors
        if (config.headers) {
          const headerKeys = Object.keys(config.headers);
          const invalidValues = ['', 'none', 'undefined', 'null', 'nan'];
          
          headerKeys.forEach(key => {
            const lowerKey = key.toLowerCase();
            const headerValue = config.headers[key];
            const valueStr = headerValue !== null && headerValue !== undefined ? String(headerValue).toLowerCase().trim() : '';
            
            // Remove church_id headers with invalid values OR if route should skip church_id
            if (lowerKey.includes('church') && (lowerKey.includes('id') || lowerKey.includes('church-id'))) {
              if (shouldSkipChurchId || invalidValues.includes(valueStr)) {
                delete config.headers[key];
                console.log(`🧹 Removed church_id header: ${key}="${headerValue}" from ${url} (skip: ${shouldSkipChurchId}, invalid: ${invalidValues.includes(valueStr)})`);
              }
            }
          });
          
          // Also explicitly check and remove common variations
          const commonChurchHeaders = [
            'x-church-id', 'X-Church-Id', 'X-CHURCH-ID',
            'church-id', 'Church-Id', 'CHURCH-ID',
            'churchId', 'ChurchId', 'CHURCHID',
            'x-churchid', 'X-ChurchId'
          ];
          
          commonChurchHeaders.forEach(headerName => {
            const value = config.headers[headerName];
            if (value !== undefined && value !== null) {
              const valueStr = String(value).toLowerCase().trim();
              if (shouldSkipChurchId || invalidValues.includes(valueStr)) {
                delete config.headers[headerName];
                console.log(`🧹 Removed church_id header (explicit): ${headerName}="${value}" from ${url}`);
              }
            } else if (shouldSkipChurchId && value === null) {
              // Remove null values for routes that should skip
              delete config.headers[headerName];
            }
          });
        }
        
        if (shouldSkipChurchId) {
          // Final cleanup: ensure ALL church-related headers are removed for these routes
          if (config.headers) {
            const remainingChurchHeaders = Object.keys(config.headers).filter(k => {
              const lowerKey = k.toLowerCase();
              return lowerKey.includes('church') && (lowerKey.includes('id') || lowerKey.includes('church-id'));
            });
            
            if (remainingChurchHeaders.length > 0) {
              remainingChurchHeaders.forEach(key => {
                delete config.headers[key];
                console.log(`🧹 Force-removed remaining church_id header: ${key} from ${url}`);
              });
            }
          }
          
          // Remove from commonHeaders if it exists
          if ((config as any).commonHeaders) {
            Object.keys((config as any).commonHeaders).forEach(key => {
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes('church') && (lowerKey.includes('id') || lowerKey.includes('church-id'))) {
                delete (config as any).commonHeaders[key];
              }
            });
          }
          
          // Debug: Log final headers for problematic routes
          if (config.headers) {
            const churchHeaders = Object.keys(config.headers).filter(k => {
              const lowerKey = k.toLowerCase();
              return lowerKey.includes('church') && (lowerKey.includes('id') || lowerKey.includes('church-id'));
            });
            if (churchHeaders.length > 0) {
              console.warn(`⚠️ Warning: Church headers still present for ${url}:`, churchHeaders);
            } else {
              console.log(`✅ Verified no church_id headers for ${url}`);
            }
          }
        }

        // fullUrl was already declared above, reuse it for logging
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
        console.log(`🔧 BaseURL: "${config.baseURL || 'none'}", URL: "${config.url}"`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('Response Error:', error.response?.status, error.response?.data);

        // Handle 401 via token refresh, then retry the original request
        if (error.response?.status === 401 && !window.location.pathname.includes('/auth/login')) {
          // Avoid infinite retry loops — only retry once per request
          if (!error.config._retried) {
            try {
              await handle401Error(error, 'api_axiosInstance');
            } catch (refreshError: any) {
              if (refreshError.tokenRefreshed) {
                // Token was refreshed — retry the original request with the new token
                error.config._retried = true;
                const newToken = localStorage.getItem('access_token');
                if (newToken) {
                  error.config.headers['Authorization'] = `Bearer ${newToken}`;
                }
                return this.instance.request(error.config);
              }
              // Refresh failed and user is being redirected to login
              throw refreshError;
            }
          }
        }

        // Create enhanced error object with HTTP details preserved
        const enhancedError = new Error(error.response?.data?.message || error.message || 'Request failed');
        (enhancedError as any).status = error.response?.status;
        (enhancedError as any).code = error.code;
        (enhancedError as any).isNetworkError = !error.response;
        (enhancedError as any).originalError = error;

        throw enhancedError;
      }
    );
  }

  // ===== CORE HTTP METHODS =====
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.request<T>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // ===== FILE UPLOAD METHOD =====
  async uploadFile<T>(
    url: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // ===== UTILITY METHODS =====
  buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

// Create and export the shared API client instance
export const apiClient = new ApiClient();
export const axiosInstance = apiClient; // Alias for backward compatibility

export default apiClient; 