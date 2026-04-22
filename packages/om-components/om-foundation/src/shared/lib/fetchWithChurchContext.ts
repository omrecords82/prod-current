/**
 * Utility function to add church context headers to API requests
 * This helps prevent "Record request without church context" warnings
 */

import { apiClient } from '@/api/utils/axiosInstance';
import type { AxiosRequestConfig } from 'axios';

interface FetchWithChurchContextOptions {
  churchId?: number | string | null;
  skipChurchContext?: boolean; // For routes that shouldn't have church context
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Makes an API request with automatic church context headers via apiClient.
 * Strips the /api prefix if present (apiClient adds it automatically).
 * @param url - The URL to fetch (with or without /api prefix)
 * @param options - Request options, including optional churchId
 * @returns Promise with parsed response data
 */
export async function fetchWithChurchContext<T = any>(
  url: string,
  options: FetchWithChurchContextOptions = {}
): Promise<T> {
  const { churchId, skipChurchContext, method = 'GET', body, headers: extraHeaders } = options;

  // Get churchId from various sources if not provided
  let finalChurchId: number | string | null | undefined = churchId;

  // If churchId is not provided, try to get it from:
  // 1. URL path (e.g., /api/admin/churches/46/...)
  const urlMatch = url.match(/\/churches\/(\d+)/);
  if (!finalChurchId && urlMatch) {
    finalChurchId = urlMatch[1];
  }

  // 2. localStorage (from user object)
  if (!finalChurchId && typeof window !== 'undefined') {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        finalChurchId = user?.church_id || user?.churchId;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // 3. sessionStorage
  if (!finalChurchId && typeof window !== 'undefined') {
    try {
      const sessionChurchId = sessionStorage.getItem('church_id') || sessionStorage.getItem('churchId');
      if (sessionChurchId) {
        finalChurchId = sessionChurchId;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Build headers with church context
  const headers: Record<string, string> = { ...extraHeaders };
  if (!skipChurchContext && finalChurchId) {
    const churchIdStr = String(finalChurchId).trim();
    if (churchIdStr && !['none', 'undefined', 'null', 'nan', ''].includes(churchIdStr.toLowerCase())) {
      headers['X-Church-Id'] = churchIdStr;
    }
  }

  // Strip /api prefix if present — apiClient adds it automatically
  const cleanUrl = url.startsWith('/api') ? url.slice(4) : url;

  const config: AxiosRequestConfig = { headers };
  const upperMethod = method.toUpperCase();

  if (upperMethod === 'GET') {
    return apiClient.get<T>(cleanUrl, config);
  } else if (upperMethod === 'POST') {
    return apiClient.post<T>(cleanUrl, body, config);
  } else if (upperMethod === 'PUT') {
    return apiClient.put<T>(cleanUrl, body, config);
  } else if (upperMethod === 'PATCH') {
    return apiClient.patch<T>(cleanUrl, body, config);
  } else if (upperMethod === 'DELETE') {
    return apiClient.delete<T>(cleanUrl, config);
  }

  return apiClient.request<T>({ url: cleanUrl, method: upperMethod, data: body, ...config });
}

/**
 * Helper to get churchId from URL or storage
 */
export function getChurchIdFromContext(): number | string | null {
  // Try localStorage first
  if (typeof window !== 'undefined') {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user?.church_id || user?.churchId) {
          return user.church_id || user.churchId;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Try sessionStorage
    try {
      const sessionChurchId = sessionStorage.getItem('church_id') || sessionStorage.getItem('churchId');
      if (sessionChurchId) {
        return sessionChurchId;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return null;
}
