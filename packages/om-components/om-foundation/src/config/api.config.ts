/**
 * API Configuration for OrthodoxMetrics Frontend
 * Centralized configuration for backend connection settings
 */

export const API_CONFIG = {
  // Base URL for API requests - use relative URL in production
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  
  // API endpoints prefix
  API_PREFIX: '/api',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
  
  // Development mode flag
  IS_DEV: import.meta.env.DEV,
  
  // Production mode flag
  IS_PROD: import.meta.env.PROD,
  
  // App version
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Environment name
  ENV: import.meta.env.VITE_APP_ENV || 'development'
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL;
  const prefix = API_CONFIG.API_PREFIX;
  
  // If endpoint already starts with /api, don't add it again
  if (endpoint.startsWith('/api')) {
    return `${baseUrl}${endpoint}`;
  }
  
  // If endpoint starts with /, add it to base URL
  if (endpoint.startsWith('/')) {
    return `${baseUrl}${prefix}${endpoint}`;
  }
  
  // Otherwise, add both prefix and slash
  return `${baseUrl}${prefix}/${endpoint}`;
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => {
  return API_CONFIG.IS_DEV;
};

// Helper function to check if we're in production mode
export const isProduction = (): boolean => {
  return API_CONFIG.IS_PROD;
};

// Log configuration on import (only in development)
if (isDevelopment()) {
  console.log('🔧 API Configuration:', {
    BASE_URL: API_CONFIG.BASE_URL,
    API_PREFIX: API_CONFIG.API_PREFIX,
    TIMEOUT: API_CONFIG.TIMEOUT,
    ENV: API_CONFIG.ENV,
    VERSION: API_CONFIG.VERSION
  });
} 