/**
 * API Client for OrthodMetrics
 * Centralized HTTP client for making API requests
 */

// API Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

// API Error class
export class ApiError extends Error {
  public status: number;
  public response?: Response;
  public data?: any;

  constructor(message: string, status: number, response?: Response, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.data = data;
  }
}

// Default API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';
const API_TIMEOUT = 30000; // 30 seconds

// Request configuration interface
interface RequestConfig extends RequestInit {
  timeout?: number;
  baseURL?: string;
}

// Create a custom fetch function with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestConfig = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }
    throw error;
  }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('access_token');
}

// Get CSRF token from meta tag
function getCSRFToken(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag ? metaTag.getAttribute('content') : null;
}

// Build full URL
function buildURL(endpoint: string, baseURL?: string): string {
  const base = baseURL || API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  let data: any;

  try {
    data = isJson ? await response.json() : await response.text();
  } catch (error) {
    throw new ApiError('Failed to parse response', response.status, response);
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
    const errors = data?.errors || [];
    throw new ApiError(message, response.status, response, { ...data, errors });
  }

  return data;
}

// Main API client function
export async function apiJson<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    baseURL,
    headers = {},
    ...fetchOptions
  } = config;

  const url = buildURL(endpoint, baseURL);

  // Prepare headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if available
  const authToken = getAuthToken();
  if (authToken) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  // Add CSRF token if available
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  // Add Accept header
  requestHeaders.Accept = 'application/json';

  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: 'include',
    });

    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      if (error.message.includes('Failed to fetch')) {
        throw new ApiError('Network error - please check your connection', 0);
      }
    }

    throw new ApiError('An unexpected error occurred', 500);
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, config?: RequestConfig) =>
    apiJson<T>(endpoint, { ...config, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, config?: RequestConfig) =>
    apiJson<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, config?: RequestConfig) =>
    apiJson<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, config?: RequestConfig) =>
    apiJson<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, config?: RequestConfig) =>
    apiJson<T>(endpoint, { ...config, method: 'DELETE' }),
};

// File upload helper
export async function uploadFile<T = any>(
  endpoint: string,
  file: File,
  additionalData: Record<string, any> = {},
  config: RequestConfig = {}
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  // Append additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const { headers = {}, ...fetchOptions } = config;

  // Remove Content-Type header to let browser set it with boundary
  const { 'Content-Type': _, ...requestHeaders } = headers;

  return apiJson<T>(endpoint, {
    ...fetchOptions,
    method: 'POST',
    body: formData,
    headers: requestHeaders,
  });
}

// Axios-style wrapper — returns { data } response shape for compatibility
export const apiClient = {
  get: async <T = any>(endpoint: string, config?: { params?: Record<string, string> } & RequestConfig) => {
    const { params, ...rest } = config || {};
    let url = endpoint;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = qs ? `${endpoint}?${qs}` : endpoint;
    }
    const data = await apiJson<T>(url, { ...rest, method: 'GET' });
    return { data };
  },
  post: async <T = any>(endpoint: string, body?: any, config?: RequestConfig) => {
    const data = await apiJson<T>(endpoint, { ...config, method: 'POST', body: body ? JSON.stringify(body) : undefined });
    return { data };
  },
  put: async <T = any>(endpoint: string, body?: any, config?: RequestConfig) => {
    const data = await apiJson<T>(endpoint, { ...config, method: 'PUT', body: body ? JSON.stringify(body) : undefined });
    return { data };
  },
  delete: async <T = any>(endpoint: string, config?: RequestConfig) => {
    const data = await apiJson<T>(endpoint, { ...config, method: 'DELETE' });
    return { data };
  },
};

// Export default
export default apiJson;
