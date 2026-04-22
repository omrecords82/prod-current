/**
 * Environment Variable Utilities
 * Safe access to Vite environment variables in the browser
 * 
 * Vite exposes env vars via import.meta.env, not process.env
 * Only variables prefixed with VITE_ are exposed to the browser
 */

/**
 * Get a boolean environment variable
 * Normalizes "true", "1", "yes", "on" (case-insensitive) to true
 * Everything else (including undefined) returns defaultValue
 * 
 * @param key - Environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if env var is not set (default: false)
 * @returns Boolean value
 */
export function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[`VITE_${key}`];
  
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const normalized = String(value).toLowerCase().trim();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Get a string environment variable
 * 
 * @param key - Environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if env var is not set (default: '')
 * @returns String value
 */
export function getEnvString(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[`VITE_${key}`];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  return String(value);
}

/**
 * Get a number environment variable
 * 
 * @param key - Environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if env var is not set or invalid (default: 0)
 * @returns Number value
 */
export function getEnvNumber(key: string, defaultValue: number = 0): number {
  const value = import.meta.env[`VITE_${key}`];
  
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Check if we're in production mode
 */
export function isProd(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Get the current mode (development, production, etc.)
 */
export function getMode(): string {
  return import.meta.env.MODE || 'development';
}
