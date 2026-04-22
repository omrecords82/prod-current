/**
 * Authentication Client for OrthodoxMetrics
 * Provides reliable auth verification and token management
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// Debug logging helper (guards against exposing secrets)
const debugLog = (message: string, data?: any) => {
    if (import.meta.env.DEV) {
        if (data && typeof data === 'object') {
            // Sanitize sensitive data
            const sanitized = { ...data };
            if ('password' in sanitized) sanitized.password = '[REDACTED]';
            if ('token' in sanitized) sanitized.token = `[TOKEN_${sanitized.token ? 'PRESENT' : 'MISSING'}]`;
            console.log(`🔐 AuthClient: ${message}`, sanitized);
        } else {
            console.log(`🔐 AuthClient: ${message}`, data);
        }
    }
};

/**
 * Check if user is authenticated by calling backend auth endpoint
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export const checkAuth = async (): Promise<boolean> => {
    try {
        debugLog('Starting auth check', { apiBase: API_BASE });

        // Get token from localStorage if exists
        const token = localStorage.getItem('auth_token');
        const hasToken = Boolean(token);
        debugLog('Token check', { hasToken });

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session-based auth
        };

        // Add Authorization header if token exists
        if (token) {
            (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        // Call auth verification endpoint
        const authUrl = `${API_BASE}/auth/check`;
        debugLog('Calling auth endpoint', { url: authUrl, hasAuthHeader: Boolean(token) });

        const response = await fetch(authUrl, fetchOptions);

        debugLog('Auth response received', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });

        if (response.ok) {
            // Try to parse user data if available
            try {
                const userData = await response.json();
                debugLog('Auth successful', { userId: userData?.id || 'unknown' });
                return true;
            } catch (parseError) {
                // Even if JSON parsing fails, 200 response means auth is valid
                debugLog('Auth successful (no JSON data)');
                return true;
            }
        } else {
            debugLog('Auth failed', { status: response.status });
            return false;
        }

    } catch (error) {
        debugLog('Auth check error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'UnknownError'
        });
        return false;
    }
};

/**
 * Alternative auth check using existing API structure
 * Fallback to legacy auth endpoints if main one fails
 */
export const checkAuthLegacy = async (): Promise<boolean> => {
    try {
        debugLog('Attempting legacy auth check');

        // Try multiple possible auth endpoints
        const endpoints = [
            '/auth/verify',
            '/user/me',
            '/auth/check',
            '/profile/me'
        ];

        for (const endpoint of endpoints) {
            try {
                const url = `${API_BASE}${endpoint}`;
                debugLog(`Trying legacy endpoint: ${endpoint}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (response.ok) {
                    debugLog(`Legacy auth successful via ${endpoint}`);
                    return true;
                }
            } catch (endpointError) {
                // Continue to next endpoint
                debugLog(`Legacy endpoint ${endpoint} failed`, { error: endpointError instanceof Error ? endpointError.message : 'Unknown' });
            }
        }

        debugLog('All legacy auth endpoints failed');
        return false;

    } catch (error) {
        debugLog('Legacy auth check failed completely', { error: error instanceof Error ? error.message : 'Unknown' });
        return false;
    }
};

/**
 * Clear all auth-related data from localStorage
 */
export const clearAuthData = (): void => {
    debugLog('Clearing auth data');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('refresh_token');
};

/**
 * Get current user data from localStorage
 */
export const getCurrentUser = () => {
    try {
        const userData = localStorage.getItem('auth_user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        debugLog('Error parsing user data from localStorage', { error });
        return null;
    }
};