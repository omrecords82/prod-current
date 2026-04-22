// Configuration management for omtrace with environment variables
import * as path from 'path';
import { AuthCredentials } from './auth.js';

export interface OmtraceConfig {
  baseUrl: string;
  superadminEmail?: string;
  superadminPassword?: string;
  cookieFile: string;
  persistCookies: boolean;
  curlBodyLimit: number;
  curlTimeoutMs: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cacheDir: string;
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): OmtraceConfig {
  const cacheDir = process.env.OMTRACE_CACHE_DIR || '.cache/omtrace';
  
  return {
    baseUrl: process.env.OMTRACE_BASE_URL || 'http://localhost:3000',
    superadminEmail: process.env.OMTRACE_SUPERADMIN_EMAIL,
    superadminPassword: process.env.OMTRACE_SUPERADMIN_PASSWORD,
    cookieFile: process.env.OMTRACE_COOKIE_FILE || path.join(cacheDir, 'cookies-superadmin.jar'),
    persistCookies: process.env.OMTRACE_PERSIST_COOKIES === '1',
    curlBodyLimit: parseInt(process.env.OMTRACE_CURL_BODY_LIMIT || '8192', 10),
    curlTimeoutMs: parseInt(process.env.OMTRACE_CURL_TIMEOUT_MS || '10000', 10),
    logLevel: (process.env.OMTRACE_LOG_LEVEL as any) || 'warn',
    cacheDir,
  };
}

/**
 * Get superadmin credentials from config
 */
export function getCredentials(config: OmtraceConfig): AuthCredentials | undefined {
  if (!config.superadminEmail || !config.superadminPassword) {
    return undefined;
  }

  return {
    email: config.superadminEmail,
    password: config.superadminPassword,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: OmtraceConfig, requireAuth = true): string[] {
  const errors: string[] = [];

  // Validate base URL
  try {
    new URL(config.baseUrl);
  } catch {
    errors.push(`Invalid OMTRACE_BASE_URL: ${config.baseUrl}`);
  }

  // Validate auth if required
  if (requireAuth && (!config.superadminEmail || !config.superadminPassword)) {
    errors.push('OMTRACE_SUPERADMIN_EMAIL and OMTRACE_SUPERADMIN_PASSWORD are required for authentication');
  }

  // Validate numeric values
  if (isNaN(config.curlBodyLimit) || config.curlBodyLimit < 0) {
    errors.push(`Invalid OMTRACE_CURL_BODY_LIMIT: ${process.env.OMTRACE_CURL_BODY_LIMIT}`);
  }

  if (isNaN(config.curlTimeoutMs) || config.curlTimeoutMs < 0) {
    errors.push(`Invalid OMTRACE_CURL_TIMEOUT_MS: ${process.env.OMTRACE_CURL_TIMEOUT_MS}`);
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`Invalid OMTRACE_LOG_LEVEL: ${config.logLevel}. Must be one of: ${validLogLevels.join(', ')}`);
  }

  return errors;
}

/**
 * Apply CLI overrides to config
 */
export function applyCliOverrides(
  config: OmtraceConfig, 
  options: {
    curlTimeout?: number;
    verbose?: boolean;
    quiet?: boolean;
  }
): OmtraceConfig {
  const overridden = { ...config };

  if (options.curlTimeout !== undefined) {
    overridden.curlTimeoutMs = options.curlTimeout;
  }

  if (options.verbose) {
    overridden.logLevel = 'debug';
  } else if (options.quiet) {
    overridden.logLevel = 'error';
  }

  return overridden;
}

/**
 * Get environment variable help text
 */
export function getConfigHelp(): string {
  return `
Environment Variables:
  OMTRACE_BASE_URL              Base URL for HTTP probes (default: http://localhost:3000)
  OMTRACE_SUPERADMIN_EMAIL      Superadmin email for authentication
  OMTRACE_SUPERADMIN_PASSWORD   Superadmin password for authentication
  OMTRACE_COOKIE_FILE          Cookie jar file path (default: .cache/omtrace/cookies-superadmin.jar)
  OMTRACE_PERSIST_COOKIES      Keep cookies between runs (default: 0, set to 1 to persist)
  OMTRACE_CURL_BODY_LIMIT      Max response body sample size in bytes (default: 8192)
  OMTRACE_CURL_TIMEOUT_MS      HTTP request timeout in milliseconds (default: 10000)
  OMTRACE_LOG_LEVEL           Logging level: error|warn|info|debug (default: warn)
  OMTRACE_CACHE_DIR           Cache directory for temp files (default: .cache/omtrace)

Examples:
  export OMTRACE_BASE_URL="http://localhost:3001"
  export OMTRACE_SUPERADMIN_EMAIL="admin@orthodoxmetrics.com"
  export OMTRACE_SUPERADMIN_PASSWORD="your-password"
  export OMTRACE_PERSIST_COOKIES=1
  export OMTRACE_LOG_LEVEL=debug
`;
}
