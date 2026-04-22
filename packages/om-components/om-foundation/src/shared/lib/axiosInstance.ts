/**
 * Shared Axios Instance for OrthodMetrics API
 * Provides unified error handling, baseURL, and interceptors
 */

import { API_CONFIG } from '@/config/api.config';
import { handle401Error } from '@/utils/authErrorHandler';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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

        // When sending FormData, remove Content-Type so the browser
        // sets multipart/form-data with the correct boundary automatically
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
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
      (error) => {
        console.error('❌ Response Error:', error.response?.status, error.response?.data);

        // Handle 401 via centralized auth error handler
        if (error.response?.status === 401) {
          if (!window.location.pathname.includes('/auth/login')) {
            handle401Error(error, 'shared_axiosInstance');
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